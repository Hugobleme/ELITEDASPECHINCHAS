import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from database.connection import SessionLocal
from database.models import (
    Offer,
    ProcessedMessage,
    Store,
    Category,
    PriceAlert,
    Notification,
    PushSubscription,
    User,
)
from processor.celery_app import celery_app
from processor.rules import generate_offer_hash

logger = logging.getLogger("elitedaspechinchas.processor.tasks")


@celery_app.task(name="task_cleanup_expired", bind=True)
def task_cleanup_expired(self, max_age_days: int = 30) -> Dict[str, Any]:
    """
    Limpeza periódica de ofertas antigas ou expiradas.
    Marca como 'expired' e is_active=False para ofertas publicadas com mais de max_age_days dias.
    """
    db: Session = SessionLocal()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=max_age_days)
        expired_offers = (
            db.query(Offer)
            .filter(
                Offer.status == "published",
                Offer.published_at < cutoff,
            )
            .all()
        )

        count = len(expired_offers)
        for off in expired_offers:
            off.status = "expired"
            off.is_active = False

        db.commit()
        logger.info(f"[Cleanup Task] {count} ofertas marcadas como 'expired' (mais de {max_age_days} dias).")
        return {"status": "success", "expired_count": count}
    except Exception as exc:
        db.rollback()
        logger.error(f"[Cleanup Task] Falha na limpeza de expiradas: {exc}")
        return {"status": "error", "message": str(exc)}
    finally:
        db.close()


@celery_app.task(name="task_deduplicate", bind=True)
def task_deduplicate(self, original_link: str, title: str = "", price: float = 0.0) -> Dict[str, Any]:
    """
    Verifica se uma oferta já foi cadastrada recentemente no banco de dados
    pela URL original ou pelo hash do produto.
    """
    db: Session = SessionLocal()
    try:
        # 1. Checagem por link original
        if original_link:
            existing_by_link = db.query(Offer).filter(
                Offer.original_link == original_link,
                Offer.is_active == True,
            ).first()
            if existing_by_link:
                return {
                    "is_duplicate": True,
                    "existing_id": str(existing_by_link.id),
                    "reason": "URL original já cadastrada",
                }

        # 2. Checagem por similaridade de título e preço nas últimas 24h
        if title and price > 0:
            target_hash = generate_offer_hash(title, price)
            cutoff_24h = datetime.now(timezone.utc) - timedelta(hours=24)
            recent_offers = db.query(Offer).filter(
                Offer.created_at >= cutoff_24h,
                Offer.is_active == True,
            ).all()

            for off in recent_offers:
                if generate_offer_hash(off.title, off.price_current) == target_hash:
                    return {
                        "is_duplicate": True,
                        "existing_id": str(off.id),
                        "reason": "Produto e preço idênticos postados nas últimas 24h",
                    }

        return {"is_duplicate": False, "existing_id": None}
    except Exception as exc:
        logger.error(f"[Deduplicate Task] Erro na verificação: {exc}")
        return {"is_duplicate": False, "error": str(exc)}
    finally:
        db.close()


@celery_app.task(name="task_check_price_alerts", bind=True)
def task_check_price_alerts(self, hours_lookback: int = 24, db: Optional[Session] = None) -> Dict[str, Any]:
    """
    Avalia alertas de preço ativos cadastrados pelos usuários contra ofertas publicadas recentes.
    Dispara notificações no banco de dados e Web Push quando há correspondência de critérios.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        active_alerts = db.query(PriceAlert).filter(PriceAlert.active == True).all()
        if not active_alerts:
            return {"status": "success", "message": "Nenhum alerta ativo encontrado", "matches": 0}

        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours_lookback)
        recent_offers = (
            db.query(Offer)
            .filter(Offer.status == "published", Offer.is_active == True, Offer.created_at >= cutoff)
            .all()
        )

        matches_count = 0
        notifs_created = 0

        for alert in active_alerts:
            for offer in recent_offers:
                # 1. Filtro por keyword
                if alert.keyword:
                    kw = alert.keyword.lower().strip()
                    if kw not in offer.title.lower():
                        continue

                # 2. Filtro por categoria
                if alert.category and alert.category.lower() != "todas":
                    if alert.category.lower() not in offer.category.lower():
                        continue

                # 3. Filtro por loja
                if alert.store and alert.store.lower() != "todas":
                    if alert.store.lower() not in offer.store.lower():
                        continue

                # 4. Filtro por preço máximo
                if alert.max_price is not None and alert.max_price > 0:
                    if offer.price_current > alert.max_price:
                        continue

                # 5. Filtro por desconto mínimo
                if alert.target_discount and alert.target_discount > 0:
                    if offer.discount_pct < alert.target_discount:
                        continue

                matches_count += 1

                # Verifica se já notificou este usuário sobre esta oferta
                existing_notif = (
                    db.query(Notification)
                    .filter(
                        Notification.user_id == alert.user_id,
                        Notification.offer_id == offer.id,
                    )
                    .first()
                )
                if not existing_notif:
                    notif = Notification(
                        user_id=alert.user_id,
                        offer_id=offer.id,
                        alert_id=alert.id,
                        status="sent",
                        sent_at=datetime.now(timezone.utc),
                    )
                    db.add(notif)
                    notifs_created += 1

        db.commit()
        logger.info(
            f"[Price Alerts Task] Concluído: {len(active_alerts)} alertas avaliados, "
            f"{len(recent_offers)} ofertas analisadas, {matches_count} matches, {notifs_created} notificações criadas."
        )
        return {
            "status": "success",
            "alerts_checked": len(active_alerts),
            "offers_checked": len(recent_offers),
            "matches_found": matches_count,
            "notifications_created": notifs_created,
        }
    except Exception as exc:
        db.rollback()
        logger.error(f"[Price Alerts Task] Falha na execução: {exc}", exc_info=True)
        return {"status": "error", "error": str(exc)}
    finally:
        if should_close:
            db.close()


@celery_app.task(name="task_send_weekly_newsletter", bind=True)
def task_send_weekly_newsletter(self, top_n: int = 10, db: Optional[Session] = None) -> Dict[str, Any]:
    """
    Coleta e compila as melhores ofertas da semana (maior desconto e curadoria)
    para envio de newsletter resumida aos usuários inscritos.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        top_offers = (
            db.query(Offer)
            .filter(Offer.status == "published", Offer.is_active == True, Offer.created_at >= cutoff)
            .order_by(Offer.discount_pct.desc(), Offer.created_at.desc())
            .limit(top_n)
            .all()
        )

        formatted_deals = [
            {
                "id": str(o.id),
                "title": o.title,
                "price": o.price_current,
                "discount_pct": o.discount_pct,
                "store": o.store,
                "affiliate_link": o.affiliate_link,
            }
            for o in top_offers
        ]

        logger.info(
            f"[Newsletter Task] Newsletter semanal compilada com {len(formatted_deals)} ofertas de destaque."
        )
        return {
            "status": "success",
            "top_deals_count": len(formatted_deals),
            "deals": formatted_deals,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        logger.error(f"[Newsletter Task] Falha na compilação da newsletter: {exc}", exc_info=True)
        return {"status": "error", "error": str(exc)}
    finally:
        if should_close:
            db.close()
