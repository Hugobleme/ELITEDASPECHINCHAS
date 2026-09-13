"""
Rotas administrativas e curadoria de ofertas para o painel admin.
"""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import Offer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin & Curadoria"])


@router.post("/offers/{offer_id}/publish")
def publish_offer(offer_id: str, db: Session = Depends(get_db)):
    """
    Publica uma oferta na vitrine e despacha a task assíncrona do Celery para envio de Web Push aos alertas casados.
    """
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta não encontrada.")

    offer.status = "published"
    offer.published_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(offer)

    # Dispara a notificação assíncrona e publicação no canal Telegram oficial
    try:
        from processor.notify import match_and_notify
        from processor.tasks import publish_offer_to_channel

        match_and_notify.delay(str(offer.id))
        publish_offer_to_channel.delay(str(offer.id))
        logger.info(f"[Publish] Celery tasks disparadas para oferta {offer.id}")
    except Exception as exc:
        logger.warning(f"[Publish] Celery não disponível ou offline: {str(exc)}")

    return offer
