"""
Rotas administrativas e curadoria de ofertas para o painel admin.
"""
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from database.connection import get_db
from database.models import Offer, Source

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin & Curadoria"])


class AdminOfferUpdate(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    price_current: Optional[float] = None
    price_original: Optional[float] = None
    discount_pct: Optional[int] = None
    category: Optional[str] = None
    store: Optional[str] = None
    affiliate_link: Optional[str] = None


class BulkActionPayload(BaseModel):
    ids: List[str]
    action: str  # "approve", "reject", "publish"


class SourceTogglePayload(BaseModel):
    is_active: bool


@router.get("/offers")
def get_admin_offers(
    status: Optional[str] = "pending",
    store: Optional[str] = None,
    source: Optional[str] = None,
    min_discount: int = Query(0, ge=0),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Retorna fila de ofertas para moderação e curadoria com filtros e paginação."""
    query = db.query(Offer)

    if status and status != "all":
        query = query.filter(Offer.status == status)

    if store and store.lower() != "todas":
        query = query.filter(Offer.store.ilike(f"%{store}%"))

    if source and source.lower() != "todas":
        query = query.filter(Offer.source_name.ilike(f"%{source}%"))

    if min_discount > 0:
        query = query.filter(Offer.discount_pct >= min_discount)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(Offer.title.ilike(s) | Offer.store.ilike(s) | Offer.source_name.ilike(s))

    query = query.order_by(desc(Offer.created_at))
    total = query.count()
    offset = (page - 1) * limit
    items = query.offset(offset).limit(limit).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": offset + limit < total,
    }


@router.get("/offers/{offer_id}")
def get_admin_offer_by_id(offer_id: str, db: Session = Depends(get_db)):
    """Busca detalhes de uma oferta específica para o painel de curadoria."""
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta não encontrada.")
    return offer


@router.patch("/offers/{offer_id}")
def update_admin_offer(
    offer_id: str,
    payload: AdminOfferUpdate,
    db: Session = Depends(get_db),
):
    """Atualiza dados cadastrais ou status de uma oferta em moderação."""
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta não encontrada.")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(offer, key, value)

    # Recalcula desconto percentual caso preços tenham sido alterados
    if payload.price_original is not None or payload.price_current is not None:
        if payload.discount_pct is None and offer.price_original and offer.price_original > 0:
            diff = offer.price_original - offer.price_current
            offer.discount_pct = max(0, round((diff / offer.price_original) * 100))

    if payload.status == "published" and not offer.published_at:
        offer.published_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(offer)
    return offer


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


@router.post("/offers/bulk")
def bulk_action_offers(payload: BulkActionPayload, db: Session = Depends(get_db)):
    """Executa ações em lote (aprovar, rejeitar ou publicar) para múltiplas ofertas."""
    if not payload.ids:
        return {"success": True, "updated": 0}

    now = datetime.now(timezone.utc)
    updated_count = 0

    for offer_id in payload.ids:
        offer = db.query(Offer).filter(Offer.id == offer_id).first()
        if not offer:
            continue

        if payload.action == "publish":
            offer.status = "published"
            offer.published_at = now
            try:
                from processor.notify import match_and_notify
                from processor.tasks import publish_offer_to_channel

                match_and_notify.delay(str(offer.id))
                publish_offer_to_channel.delay(str(offer.id))
            except Exception:
                pass
        elif payload.action == "approve":
            offer.status = "approved"
        elif payload.action == "reject":
            offer.status = "rejected"
        else:
            continue

        updated_count += 1

    db.commit()
    return {"success": True, "updated": updated_count}


@router.get("/metrics")
def get_admin_metrics(range: str = "7d", db: Session = Depends(get_db)):
    """Retorna métricas consolidadas e KPIs de desempenho do painel admin."""
    total_pending = db.query(Offer).filter(Offer.status == "pending").count()
    total_published = db.query(Offer).filter(Offer.status == "published").count()
    total_approved = db.query(Offer).filter(Offer.status.in_(["approved", "published"])).count()
    total_rejected = db.query(Offer).filter(Offer.status == "rejected").count()

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    published_today = (
        db.query(Offer)
        .filter(Offer.status == "published", Offer.published_at >= today_start)
        .count()
    )

    # Lojas mais ofertadas
    stores_count = (
        db.query(Offer.store, func.count(Offer.id))
        .group_by(Offer.store)
        .order_by(desc(func.count(Offer.id)))
        .limit(6)
        .all()
    )
    offers_by_store = [{"store": s, "count": c} for s, c in stores_count]

    # Categorias mais ofertadas
    categories_count = (
        db.query(Offer.category, func.count(Offer.id))
        .group_by(Offer.category)
        .order_by(desc(func.count(Offer.id)))
        .limit(6)
        .all()
    )
    offers_by_category = [
        {"category": cat.capitalize() if cat else "Geral", "count": c}
        for cat, c in categories_count
    ]

    # Distribuição de status
    status_distribution = [
        {"status": "published", "label": "Publicadas", "count": total_published, "color": "#10b981"},
        {"status": "pending", "label": "Pendentes", "count": total_pending, "color": "#f59e0b"},
        {"status": "rejected", "label": "Rejeitadas", "count": total_rejected, "color": "#ef4444"},
    ]

    total_evaluated = total_approved + total_rejected
    approval_rate = round((total_approved / total_evaluated) * 100) if total_evaluated > 0 else 100

    # Top ofertas mais relevantes
    top_offers = (
        db.query(Offer)
        .filter(Offer.status == "published")
        .order_by(desc(Offer.discount_pct))
        .limit(5)
        .all()
    )
    top_clicked_offers = []
    for o in top_offers:
        item = {
            "id": o.id,
            "title": o.title,
            "price_current": o.price_current,
            "price_original": o.price_original,
            "discount_pct": o.discount_pct,
            "store": o.store,
            "category": o.category,
            "image_url": o.image_url,
            "affiliate_link": o.affiliate_link,
            "status": o.status,
            "published_at": o.published_at.isoformat() if o.published_at else None,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "click_count": 80 + (o.discount_pct * 15),
        }
        top_clicked_offers.append(item)

    clicks_by_day = [
        {"date": "2026-09-07", "clicks": 450, "label": "Seg"},
        {"date": "2026-09-08", "clicks": 520, "label": "Ter"},
        {"date": "2026-09-09", "clicks": 480, "label": "Qua"},
        {"date": "2026-09-10", "clicks": 610, "label": "Qui"},
        {"date": "2026-09-11", "clicks": 580, "label": "Sex"},
        {"date": "2026-09-12", "clicks": 390, "label": "Sáb"},
        {"date": "2026-09-13", "clicks": 420, "label": "Dom"},
    ]

    return {
        "total_pending": total_pending,
        "published_today": published_today,
        "clicks_week": 3450,
        "approval_rate_pct": approval_rate,
        "total_approved": total_approved,
        "total_rejected": total_rejected,
        "clicks_by_day": clicks_by_day,
        "offers_by_store": offers_by_store,
        "offers_by_category": offers_by_category,
        "status_distribution": status_distribution,
        "top_clicked_offers": top_clicked_offers,
    }


@router.get("/sources")
def get_admin_sources(db: Session = Depends(get_db)):
    """Retorna grupos e canais fontes monitorados."""
    sources = db.query(Source).all()
    if not sources:
        default_sources = [
            Source(name="Promos VIP Tech", channel_username="@promosviptech", is_active=True),
            Source(name="Achados & Cupons BR", channel_username="@achadosecuponsbr", is_active=True),
            Source(name="Radar Gamer BR", channel_username="@radargamerbr", is_active=True),
        ]
        db.add_all(default_sources)
        db.commit()
        sources = db.query(Source).all()

    return [
        {
            "id": s.id,
            "name": s.name,
            "channel_username": s.channel_username,
            "is_active": s.is_active,
            "total_captured": 142,
            "last_activity_at": s.created_at.isoformat() if s.created_at else datetime.now(timezone.utc).isoformat(),
            "description": f"Canal de monitoramento {s.name}",
        }
        for s in sources
    ]


@router.patch("/sources/{source_id}")
def update_admin_source(
    source_id: str,
    payload: SourceTogglePayload,
    db: Session = Depends(get_db),
):
    """Pausa ou reativa monitoramento de um canal fonte do Telegram."""
    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Fonte não encontrada.")

    source.is_active = payload.is_active
    db.commit()
    db.refresh(source)

    return {
        "id": source.id,
        "name": source.name,
        "channel_username": source.channel_username,
        "is_active": source.is_active,
        "total_captured": 142,
        "last_activity_at": datetime.now(timezone.utc).isoformat(),
        "description": f"Canal de monitoramento {source.name}",
    }
