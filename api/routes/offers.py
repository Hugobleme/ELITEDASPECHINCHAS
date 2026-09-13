"""
Rotas públicas de ofertas, categorias, lojas, tracking de cliques e ingestão de teste controlada.
"""
import os
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from database.connection import get_db
from database.models import Offer
from api.schemas.offer import OfferRead, OffersPaginatedResponse, TestOfferIngestRequest
from processor.parser import parse_telegram_message
from processor.rules import evaluate_rules
from processor.affiliate import generate_affiliate_link

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Vitrine Pública"])


@router.get("/offers", response_model=OffersPaginatedResponse)
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
    """
    Retorna apenas ofertas com status 'published' na vitrine pública.
    Aplica filtros de loja, categoria, desconto mínimo, busca textual, ordenação e paginação.
    """
    query = db.query(Offer).filter(Offer.status == "published")

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
        query = query.order_by(desc(Offer.published_at), desc(Offer.created_at))

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


@router.get("/offers/{offer_id}", response_model=OfferRead)
def get_offer_details(offer_id: str, db: Session = Depends(get_db)):
    """Busca detalhes de uma oferta publicada pelo ID."""
    offer = (
        db.query(Offer)
        .filter(Offer.id == offer_id, Offer.status == "published")
        .first()
    )
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta não encontrada.")
    return offer


@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    """Retorna lista de categorias com contagem de ofertas publicadas."""
    results = (
        db.query(Offer.category, func.count(Offer.id))
        .filter(Offer.status == "published")
        .group_by(Offer.category)
        .all()
    )
    return [{"name": cat.capitalize(), "slug": cat, "count": count} for cat, count in results]


@router.get("/stores")
def get_stores(db: Session = Depends(get_db)):
    """Retorna lista de lojas parceiras com contagem de ofertas publicadas."""
    results = (
        db.query(Offer.store, func.count(Offer.id))
        .filter(Offer.status == "published")
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


@router.post("/offers/test-ingest", response_model=OfferRead, status_code=status.HTTP_201_CREATED)
def test_ingest_offer(
    payload: TestOfferIngestRequest,
    x_test_key: Optional[str] = Header(None, alias="X-Test-Key"),
    db: Session = Depends(get_db),
):
    """
    Endpoint seguro para inserção controlada de oferta de teste.
    - Bloqueado em produção (ENVIRONMENT == 'production');
    - Exige cabeçalho X-Test-Key configurado;
    - Executa validação de regras, geração de link de afiliado e persistência no banco com status 'published'.
    """
    current_env = os.getenv("ENVIRONMENT", "development").lower().strip()
    if current_env == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Endpoint de teste desabilitado em ambiente de produção.",
        )

    expected_key = os.getenv("TEST_INGEST_KEY")
    if not expected_key or not x_test_key or x_test_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Acesso não autorizado. Chave X-Test-Key inválida ou TEST_INGEST_KEY não configurada.",
        )

    # Se forneceu raw_text, roda pelo parser completo
    if payload.raw_text:
        parsed = parse_telegram_message(payload.raw_text)
    else:
        parsed = {
            "title": payload.title or "",
            "price_current": payload.price_current or 0.0,
            "price_original": payload.price_original or (payload.price_current or 0.0),
            "discount_pct": payload.discount_pct or 0,
            "store": payload.store or "",
            "category": payload.category or "eletronicos",
            "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
            "original_link": payload.original_link,
            "coupon_code": payload.coupon_code,
        }

    # Valida contra o motor de regras
    is_approved, reason, _ = evaluate_rules(
        parsed_data=parsed,
        db=db,
        telegram_msg_id=None,
        source_name=payload.source_name,
    )
    if not is_approved:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Oferta rejeitada pelas regras de curadoria: {reason}",
        )

    # Gera link de afiliado oficial
    affiliate_link = generate_affiliate_link(
        original_link=parsed["original_link"],
        store=parsed["store"],
        db=db,
    )

    now_utc = datetime.now(timezone.utc)
    new_offer = Offer(
        title=parsed["title"],
        price_current=parsed["price_current"],
        price_original=parsed["price_original"],
        discount_pct=parsed["discount_pct"],
        store=parsed["store"],
        category=parsed["category"],
        image_url=parsed.get("image_url") or "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
        original_link=parsed["original_link"],
        affiliate_link=affiliate_link,
        coupon_code=parsed.get("coupon_code"),
        source_name=payload.source_name,
        status="published",
        published_at=now_utc,
        created_at=now_utc,
    )

    db.add(new_offer)
    db.commit()
    db.refresh(new_offer)

    logger.info(f"[Test Ingest] Oferta de teste criada com sucesso: ID {new_offer.id}")
    return new_offer
