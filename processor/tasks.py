import logging
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from database.connection import SessionLocal
from database.models import Offer
from processor.celery_app import celery_app
from processor.parser import parse_telegram_message
from processor.affiliate import generate_affiliate_link
from processor.rules import evaluate_rules
from processor.notify import match_and_notify
from bot.formatter import format_telegram_card_html
from bot.publisher import publish_to_telegram
from config import TARGET_CHANNEL_ID

logger = logging.getLogger("elitedaspechinchas.processor.tasks")


@celery_app.task(name="process_telegram_message", bind=True, max_retries=3, default_retry_delay=10)
def process_telegram_message(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Task principal de ingestão assíncrona:
    1. Executa o parser inteligente na mensagem de origem.
    2. Aplica o motor de regras (desconto mínimo, deduplicação 24h, rate limit).
    3. Converte a URL original para o link de afiliado oficial correspondente à loja.
    4. Persiste a oferta no PostgreSQL com status 'pending' (para curadoria na Fase 2)
       ou 'published' (se a auto-aprovação estiver habilitada).
    5. Se for publicada, agenda publicação no canal oficial e dispara alertas Web Push (Fase 3).
    """
    text = raw_data.get("text", "")
    telegram_msg_id = raw_data.get("telegram_msg_id")
    source_name = raw_data.get("source_name")
    media_url = raw_data.get("media_url")
    entities_links = raw_data.get("entities_links", [])

    logger.info(f"[Tasks] Iniciando processamento de mensagem msg_id={telegram_msg_id} da fonte {source_name or 'NÃO INFORMADA'}")

    db: Session = SessionLocal()
    try:
        # 1. Parsing
        parsed = parse_telegram_message(
            text=text,
            media_url=media_url,
            entities_links=entities_links,
        )

        # 2. Avaliação de Regras
        is_approved, reason, initial_status = evaluate_rules(
            parsed_data=parsed,
            db=db,
            telegram_msg_id=telegram_msg_id,
            source_name=source_name,
        )

        if not is_approved:
            logger.info(f"[Tasks] Oferta rejeitada pelas regras: {reason}")
            return {
                "status": "rejected",
                "reason": reason,
                "title": parsed.get("title"),
            }

        # 3. Substituição pelo Link de Afiliado
        affiliate_link = generate_affiliate_link(
            original_link=parsed["original_link"],
            store=parsed["store"],
            db=db,
        )

        # 4. Persistência no Banco de Dados
        new_offer = Offer(
            title=parsed["title"],
            price_current=parsed["price_current"],
            price_original=parsed["price_original"],
            discount_pct=parsed["discount_pct"],
            store=parsed["store"],
            category=parsed["category"],
            image_url=parsed["image_url"],
            original_link=parsed["original_link"],
            affiliate_link=affiliate_link,
            coupon_code=parsed.get("coupon_code"),
            telegram_msg_id=telegram_msg_id,
            source_name=source_name,
            status=initial_status,
            published_at=datetime.utcnow() if initial_status == "published" else None,
        )

        db.add(new_offer)
        db.commit()
        db.refresh(new_offer)

        offer_id = str(new_offer.id)
        logger.info(
            f"✅ [Tasks] Oferta salva no banco com ID {offer_id} | Status: '{initial_status}' | "
            f"Loja: {new_offer.store} | Desconto: {new_offer.discount_pct}%"
        )

        # 5. Fluxo de Publicação Automática (se status='published')
        if initial_status == "published":
            logger.info(f"[Tasks] Disparando publicação automática para oferta {offer_id}")
            try:
                publish_offer_to_channel.delay(offer_id)
            except Exception:
                try:
                    publish_offer_to_channel(offer_id)
                except Exception as direct_pub_err:
                    logger.warning(f"[Tasks] Fallback de publicação direta ignorado: {direct_pub_err}")

            try:
                match_and_notify.delay(offer_id)
            except Exception:
                try:
                    match_and_notify(offer_id)
                except Exception as direct_notif_err:
                    logger.warning(f"[Tasks] Fallback de notificação direta ignorado: {direct_notif_err}")

        return {
            "status": "success",
            "offer_id": offer_id,
            "initial_status": initial_status,
            "title": new_offer.title,
            "affiliate_link": affiliate_link,
            "coupon_code": new_offer.coupon_code,
        }

    except Exception as exc:
        db.rollback()
        logger.error(f"[Tasks] Erro fatal no processamento da mensagem: {exc}", exc_info=True)
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task(name="publish_offer_to_channel", bind=True, max_retries=3, default_retry_delay=15)
def publish_offer_to_channel(self, offer_id: str, channel_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Publica uma oferta aprovada no canal do Telegram e atualiza seu status para 'published'.
    Dispara subsequentemente o matching de alertas para Web Push.
    """
    target_channel = channel_id or TARGET_CHANNEL_ID
    db: Session = SessionLocal()
    try:
        offer = db.query(Offer).filter(Offer.id == offer_id).first()
        if not offer:
            logger.error(f"[Publish Task] Oferta {offer_id} não encontrada no banco.")
            return {"status": "error", "message": f"Oferta {offer_id} inexistente"}

        # Formata o card com cupom e link de afiliado
        card_data = {
            "title": offer.title,
            "price_current": offer.price_current,
            "price_original": offer.price_original,
            "discount_pct": offer.discount_pct,
            "store": offer.store,
            "affiliate_link": offer.affiliate_link,
            "coupon_code": offer.coupon_code,
        }

        formatted_message = format_telegram_card_html(card_data)

        # Envia para o Telegram via Bot API
        pub_result = publish_to_telegram(
            message=formatted_message,
            channel_id=target_channel,
            image_url=offer.image_url,
            parse_mode="HTML",
        )

        # Atualiza status e data de publicação
        offer.status = "published"
        offer.published_at = datetime.utcnow()
        db.commit()

        # Dispara alertas de preço e push (Fase 3)
        match_and_notify.delay(offer.id)

        logger.info(f"🚀 [Publish Task] Oferta {offer.id} publicada no canal {target_channel}!")
        return {
            "status": "success",
            "offer_id": str(offer.id),
            "channel": target_channel,
            "publish_result": pub_result,
        }

    except Exception as exc:
        db.rollback()
        logger.error(f"[Publish Task] Erro ao publicar oferta {offer_id}: {exc}")
        raise self.retry(exc=exc)
    finally:
        db.close()
