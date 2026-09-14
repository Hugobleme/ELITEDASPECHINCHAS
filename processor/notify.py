import os
import json
import logging
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from database.connection import SessionLocal
from database.models import Offer, PriceAlert, PushSubscription, Notification
from processor.celery_app import celery_app

logger = logging.getLogger(__name__)

VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_SUBJECT = os.getenv("VAPID_SUBJECT", "mailto:admin@elitedaspechinchas.com.br")
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:3000").rstrip("/")


def match_alert(alert: PriceAlert, offer: Offer) -> bool:
    """
    Verifica se uma oferta atende aos critérios configurados em um alerta de preço.
    Critérios:
    - Desconto da oferta >= target_discount
    - Se category definido: deve bater com offer.category (case-insensitive)
    - Se store definido: deve bater com offer.store (case-insensitive)
    - Se keyword definido: deve estar presente no título da oferta (case-insensitive)
    """
    if not alert.active:
        return False

    # 1. Validação de Desconto Mínimo
    if offer.discount_pct < alert.target_discount:
        return False

    # 2. Validação de Categoria (se configurada)
    if alert.category and alert.category.lower().strip() != offer.category.lower().strip():
        return False

    # 3. Validação de Loja (se configurada)
    if alert.store and alert.store.lower().strip() != offer.store.lower().strip():
        return False

    # 4. Validação de Palavra-chave (se configurada)
    if alert.keyword:
        kw = alert.keyword.lower().strip()
        if kw not in offer.title.lower():
            return False

    return True


def dispatch_push_payload(subscription: PushSubscription, payload: Dict[str, Any], db: Session) -> bool:
    """
    Envia notificação Web Push usando pywebpush.
    Se o endpoint responder 410 Gone ou 404 Not Found, exclui a inscrição expirada do banco.
    """
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        logger.warning("[Push] Chaves VAPID não configuradas. Simulação de envio registrada.")
        return True

    try:
        from pywebpush import webpush, WebPushException

        subscription_info = {
            "endpoint": subscription.endpoint,
            "keys": {
                "p256dh": subscription.p256dh,
                "auth": subscription.auth,
            },
        }

        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_SUBJECT},
            timeout=10,
        )
        return True

    except Exception as exc:
        # Tratamento de erro 410 Gone (inscrição cancelada no navegador)
        status_code = getattr(getattr(exc, "response", None), "status_code", None)
        if status_code in (404, 410):
            logger.info(f"[Push] Inscrição expirada ({status_code}). Removendo do banco: {subscription.id}")
            db.delete(subscription)
            db.commit()
        else:
            logger.error(f"[Push] Erro ao disparar Web Push para {subscription.id}: {str(exc)}")
        return False


@celery_app.task(name="match_and_notify", bind=True, max_retries=3, default_retry_delay=10)
def match_and_notify(self, offer_id: str) -> Dict[str, Any]:
    """
    Celery task assíncrona disparada quando uma oferta é publicada (status='published').
    1. Busca a oferta no PostgreSQL.
    2. Localiza todos os alertas ativos em price_alerts que casam com a oferta.
    3. Deduplica por usuário (evita notificar 2x a mesma pessoa para a mesma oferta).
    4. Envia notificações Web Push para cada inscrição do usuário.
    5. Registra o log na tabela notifications.
    """
    db = SessionLocal()
    try:
        offer = db.query(Offer).filter(Offer.id == offer_id).first()
        if not offer or offer.status != "published":
            logger.info(f"[Notify Task] Oferta {offer_id} inexistente ou não publicada.")
            return {"status": "skipped", "reason": "offer not published"}

        # Busca todos os alertas ativos
        alerts = db.query(PriceAlert).filter(PriceAlert.active == True).all()

        matched_alerts = [a for a in alerts if match_alert(a, offer)]
        if not matched_alerts:
            logger.info(f"[Notify Task] Nenhum alerta casado para a oferta {offer.title}")
            return {"status": "success", "matched_alerts": 0, "notifications_sent": 0}

        # Deduplica usuários para notificar apenas uma vez por oferta
        user_alert_map: Dict[str, PriceAlert] = {}
        for alert in matched_alerts:
            if alert.user_id not in user_alert_map:
                user_alert_map[alert.user_id] = alert

        notifications_sent = 0

        # Monta payload Web Push com imagem, desconto e URL oficial
        payload = {
            "title": f"🔥 Alerta de Oferta: -{offer.discount_pct}% OFF!",
            "body": f"{offer.title} por R$ {offer.price_current:.2f} na {offer.store}",
            "icon": "/icon-192x192.png",
            "image": offer.image_url,
            "badge": "/badge-72x72.png",
            "data": {
                "url": f"{APP_BASE_URL}/oferta/{offer.id}",
                "offer_id": str(offer.id),
            },
        }

        for user_id, alert in user_alert_map.items():
            # Verifica se o usuário já recebeu notificação para esta oferta específica (deduplicação)
            already_notified = (
                db.query(Notification)
                .filter(Notification.user_id == user_id, Notification.offer_id == str(offer.id))
                .first()
            )
            if already_notified:
                continue

            # Busca as inscrições push do usuário
            subscriptions = (
                db.query(PushSubscription)
                .filter(PushSubscription.user_id == user_id)
                .all()
            )

            user_sent = False
            for sub in subscriptions:
                success = dispatch_push_payload(sub, payload, db)
                if success:
                    user_sent = True

            # Registra auditoria no histórico de notificações
            notif = Notification(
                user_id=user_id,
                offer_id=str(offer.id),
                alert_id=alert.id,
                status="sent" if user_sent else "failed",
            )
            db.add(notif)
            if user_sent:
                notifications_sent += 1

        db.commit()

        logger.info(
            f"[Notify Task] Concluído para oferta {offer_id}: {len(matched_alerts)} alertas casados, "
            f"{notifications_sent} notificações enviadas."
        )
        return {
            "status": "success",
            "matched_alerts": len(matched_alerts),
            "notifications_sent": notifications_sent,
        }

    except Exception as exc:
        db.rollback()
        logger.error(f"[Notify Task] Erro ao processar alertas: {str(exc)}")
        raise self.retry(exc=exc)

    finally:
        db.close()
