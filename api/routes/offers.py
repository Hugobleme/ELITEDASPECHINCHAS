"""
Rotas públicas de ofertas, categorias, lojas e tracking de cliques.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from database.connection import get_db
from database.models import Offer

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Vitrine Pública"])


@router.get("/offers")
def list_offers(
    store: Optional[str] = None,
    category: Optional[str] = None,
    min_discount: int = Query(0, ge=0),
    sort: str = Query("recent", pattern="^(recent|discount|price)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Lista de ofertas ativas para a vitrine pública com filtros e paginação."""
    query = db.query(Offer).filter(Offer.status.in_(["published", "approved"]))

    if store and store.lower() != "todas":
        query = query.filter(Offer.store.ilike(f"%{store}%"))

    if category and category.lower() != "todas":
        query = query.filter(Offer.category.ilike(category))

    if min_discount > 0:
        query = query.filter(Offer.discount_pct >= min_discount)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(Offer.title.ilike(s) | Offer.store.ilike(s) | Offer.category.ilike(s))

    if sort == "discount":
        query = query.order_by(desc(Offer.discount_pct))
    elif sort == "price":
        query = query.order_by(Offer.price_current.asc())
    else:
        query = query.order_by(desc(Offer.published_at))

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
def get_offer_details(offer_id: str, db: Session = Depends(get_db)):
    """Busca detalhes de uma oferta pelo ID."""
    offer = (
        db.query(Offer)
        .filter(Offer.id == offer_id, Offer.status.in_(["published", "approved"]))
        .first()
    )
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta não encontrada.")
    return offer


@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    """Retorna lista de categorias disponíveis com contagem."""
    results = (
        db.query(Offer.category, func.count(Offer.id))
        .filter(Offer.status.in_(["published", "approved"]))
        .group_by(Offer.category)
        .all()
    )
    return [{"name": cat.capitalize(), "slug": cat, "count": count} for cat, count in results]


@router.get("/stores")
def get_stores(db: Session = Depends(get_db)):
    """Retorna lista de lojas disponíveis com contagem."""
    results = (
        db.query(Offer.store, func.count(Offer.id))
        .filter(Offer.status.in_(["published", "approved"]))
        .group_by(Offer.store)
        .all()
    )
    return [
        {"name": store, "slug": store.lower().replace(" ", "-"), "count": count}
        for store, count in results
    ]


@router.post("/events/click", tags=["Métricas & Tracking"])
def track_affiliate_click(payload: dict):
    """Registra evento de clique no link de afiliado."""
    offer_id = payload.get("offer_id")
    logger.info(f"[Tracking Event] Clique registrado para oferta {offer_id}")
    return {"status": "success", "tracked": True}
