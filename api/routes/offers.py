"""
Rotas públicas e administrativas de ofertas, cupons, categorias, lojas, busca e tracking.
"""
import os
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from database.connection import get_db
from database.models import Offer
from api.schemas.offer import (
    OfferRead,
    OffersPaginatedResponse,
    OfferCreate,
    OfferUpdate,
    CouponRead,
    CouponsPaginatedResponse,
    CategoryDetail,
    StoreDetail,
    TestOfferIngestRequest,
)
from api.services.mock_data import (
    PYTHON_MOCK_COUPONS,
    PYTHON_MOCK_CATEGORIES,
    PYTHON_MOCK_STORES,
)
from processor.parser import parse_telegram_message
from processor.rules import evaluate_rules
from processor.affiliate import generate_affiliate_link

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Vitrine e Catálogo"])


# ==============================================================================
# 1. Ofertas (Públicas e CRUD)
# ==============================================================================

@router.get("/offers", response_model=OffersPaginatedResponse)
def list_offers(
    store: Optional[str] = None,
    category: Optional[str] = None,
    min_discount: int = Query(0, ge=0),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    sort: str = Query("recent", pattern="^(recent|discount|price)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Retorna ofertas publicadas na vitrine pública com filtros, ordenação e paginação.
    """
    query = db.query(Offer).filter(Offer.status == "published")

    if store and store.lower() != "todas":
        query = query.filter(Offer.store.ilike(f"%{store}%"))

    if category and category.lower() != "todas":
        query = query.filter(Offer.category.ilike(category))

    if min_discount > 0:
        query = query.filter(Offer.discount_pct >= min_discount)

    if min_price is not None:
        query = query.filter(Offer.price_current >= min_price)

    if max_price is not None:
        query = query.filter(Offer.price_current <= max_price)

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


@router.post("/offers", response_model=OfferRead, status_code=status.HTTP_201_CREATED)
def create_offer(payload: OfferCreate, db: Session = Depends(get_db)):
    """
    Cria uma nova oferta no sistema.
    Calcula automaticamente o desconto percentual e o link de afiliado oficial se omitidos.
    """
    price_orig = payload.price_original or payload.price_current
    disc_pct = payload.discount_pct
    if disc_pct is None:
        if price_orig > payload.price_current:
            disc_pct = round(((price_orig - payload.price_current) / price_orig) * 100)
        else:
            disc_pct = 0

    aff_link = payload.affiliate_link or generate_affiliate_link(
        original_link=payload.original_link,
        store=payload.store,
        db=db,
    )

    now_utc = datetime.now(timezone.utc)
    new_offer = Offer(
        title=payload.title,
        price_current=payload.price_current,
        price_original=price_orig,
        discount_pct=disc_pct,
        store=payload.store,
        category=payload.category,
        image_url=payload.image_url or "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
        original_link=payload.original_link,
        affiliate_link=aff_link,
        coupon_code=payload.coupon_code,
        status=payload.status,
        published_at=now_utc if payload.status == "published" else None,
        created_at=now_utc,
    )
    db.add(new_offer)
    db.commit()
    db.refresh(new_offer)
    logger.info(f"[API] Oferta criada: ID {new_offer.id}")
    return new_offer


@router.put("/offers/{offer_id}", response_model=OfferRead)
def update_offer(offer_id: str, payload: OfferUpdate, db: Session = Depends(get_db)):
    """Atualiza atributos de uma oferta existente."""
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta não encontrada.")

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(offer, k, v)

    # Recalcula desconto se preços tiverem sido alterados
    if (payload.price_original is not None or payload.price_current is not None) and payload.discount_pct is None:
        if offer.price_original and offer.price_original > offer.price_current:
            offer.discount_pct = round(((offer.price_original - offer.price_current) / offer.price_original) * 100)

    db.commit()
    db.refresh(offer)
    return offer


@router.delete("/offers/{offer_id}", status_code=status.HTTP_200_OK)
def delete_offer(offer_id: str, db: Session = Depends(get_db)):
    """Remove uma oferta pelo ID."""
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta não encontrada.")

    db.delete(offer)
    db.commit()
    return {"status": "success", "deleted_id": offer_id}


# ==============================================================================
# 2. Busca Full-Text
# ==============================================================================

@router.get("/search", response_model=OffersPaginatedResponse)
def search_offers(
    q: str = Query(..., min_length=1, description="Termo de pesquisa"),
    store: Optional[str] = None,
    category: Optional[str] = None,
    min_discount: int = Query(0, ge=0),
    sort: str = Query("recent", pattern="^(recent|discount|price)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Busca full-text em ofertas publicadas por título, loja ou categoria.
    """
    s = f"%{q.strip()}%"
    query = (
        db.query(Offer)
        .filter(
            Offer.status == "published",
            (Offer.title.ilike(s) | Offer.store.ilike(s) | Offer.category.ilike(s)),
        )
    )

    if store and store.lower() != "todas":
        query = query.filter(Offer.store.ilike(f"%{store}%"))

    if category and category.lower() != "todas":
        query = query.filter(Offer.category.ilike(category))

    if min_discount > 0:
        query = query.filter(Offer.discount_pct >= min_discount)

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


# ==============================================================================
# 3. Cupons de Desconto
# ==============================================================================

@router.get("/coupons", response_model=CouponsPaginatedResponse)
def list_coupons(
    store: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Retorna cupons de desconto ativos com filtros de loja, categoria e busca textual.
    Utiliza cupons registrados em ofertas ou a base de cupons verificados de referência.
    """
    # Base de dados mockada integrada
    results = list(PYTHON_MOCK_COUPONS)

    if store and store.lower() != "todas":
        st_lower = store.lower()
        results = [c for c in results if st_lower in c["store"].lower() or st_lower in c.get("store_slug", "").lower()]

    if category and category.lower() != "todas":
        cat_lower = category.lower()
        results = [c for c in results if c["category"].lower() in (cat_lower, "todas")]

    if search:
        s_lower = search.strip().lower()
        results = [
            c for c in results
            if s_lower in c["code"].lower()
            or s_lower in c["store"].lower()
            or s_lower in c.get("description", "").lower()
            or s_lower in c.get("discount_text", "").lower()
        ]

    total = len(results)
    start = (page - 1) * limit
    paginated = results[start : start + limit]

    return {
        "items": paginated,
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": start + limit < total,
    }


@router.get("/coupons/{coupon_id}", response_model=CouponRead)
def get_coupon_by_id(coupon_id: str):
    """Busca cupom específico pelo identificador."""
    for c in PYTHON_MOCK_COUPONS:
        if c["id"] == coupon_id or c["code"].lower() == coupon_id.lower():
            return c
    raise HTTPException(status_code=404, detail="Cupom não encontrado.")


# ==============================================================================
# 4. Categorias e Lojas (com Slugs)
# ==============================================================================

@router.get("/categories", response_model=List[CategoryDetail])
def get_categories(db: Session = Depends(get_db)):
    """Retorna lista de categorias com contagem de ofertas publicadas."""
    db_results = (
        db.query(Offer.category, func.count(Offer.id))
        .filter(Offer.status == "published")
        .group_by(Offer.category)
        .all()
    )

    if db_results:
        return [{"name": cat.capitalize(), "slug": cat, "count": count} for cat, count in db_results]

    return PYTHON_MOCK_CATEGORIES


@router.get("/categories/{slug}", response_model=CategoryDetail)
def get_category_by_slug(slug: str, db: Session = Depends(get_db)):
    """Busca categoria detalhada pelo slug."""
    clean_slug = slug.strip().lower()
    for cat in PYTHON_MOCK_CATEGORIES:
        if cat["slug"] == clean_slug:
            count = (
                db.query(func.count(Offer.id))
                .filter(Offer.status == "published", Offer.category.ilike(clean_slug))
                .scalar()
                or cat["count"]
            )
            return {
                "name": cat["name"],
                "slug": cat["slug"],
                "count": count,
                "description": cat.get("description"),
            }
    raise HTTPException(status_code=404, detail=f"Categoria '{slug}' não encontrada.")


@router.get("/stores", response_model=List[StoreDetail])
def get_stores(db: Session = Depends(get_db)):
    """Retorna lista de lojas parceiras com contagem de ofertas publicadas."""
    db_results = (
        db.query(Offer.store, func.count(Offer.id))
        .filter(Offer.status == "published")
        .group_by(Offer.store)
        .all()
    )

    if db_results:
        return [
            {"name": store, "slug": store.lower().replace(" ", "-"), "count": count}
            for store, count in db_results
        ]

    return PYTHON_MOCK_STORES


@router.get("/stores/{slug}", response_model=StoreDetail)
def get_store_by_slug(slug: str, db: Session = Depends(get_db)):
    """Busca loja parceira detalhada pelo slug."""
    clean_slug = slug.strip().lower()
    for st in PYTHON_MOCK_STORES:
        if st["slug"] == clean_slug or st["name"].lower().replace(" ", "-") == clean_slug:
            count = (
                db.query(func.count(Offer.id))
                .filter(Offer.status == "published", Offer.store.ilike(f"%{st['name']}%"))
                .scalar()
                or st["count"]
            )
            return {
                "name": st["name"],
                "slug": st["slug"],
                "count": count,
                "url": st.get("url"),
            }
    raise HTTPException(status_code=404, detail=f"Loja '{slug}' não encontrada.")


# ==============================================================================
# 5. Tracking de Cliques e Test Ingest
# ==============================================================================

@router.post("/events/click", tags=["Métricas & Tracking"])
def track_affiliate_click(payload: dict):
    """
    Registra evento de clique no link de afiliado.
    """
    offer_id = payload.get("offer_id")
    now_iso = datetime.now(timezone.utc).isoformat()
    logger.info(f"[Tracking Event] Clique registrado para oferta {offer_id} às {now_iso}")
    return {"status": "success", "tracked": True}


@router.post("/offers/test-ingest", response_model=OfferRead, status_code=status.HTTP_201_CREATED)
def test_ingest_offer(
    payload: TestOfferIngestRequest,
    x_test_key: Optional[str] = Header(None, alias="X-Test-Key"),
    db: Session = Depends(get_db),
):
    """
    Endpoint seguro para inserção controlada de oferta de teste em desenvolvimento.
    """
    raw_env = os.getenv("ENVIRONMENT")
    if not raw_env:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Endpoint de teste desabilitado: variável ENVIRONMENT não configurada.",
        )
    current_env = raw_env.lower().strip()
    if current_env not in ("development", "test"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Endpoint de teste desabilitado no ambiente '{current_env}'. Permitido exclusivamente em 'development' ou 'test'.",
        )

    expected_key = os.getenv("TEST_INGEST_KEY")
    if not expected_key or not expected_key.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Endpoint de teste desabilitado: TEST_INGEST_KEY não configurada no servidor.",
        )

    if not x_test_key or x_test_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Acesso não autorizado. Chave X-Test-Key ausente ou inválida.",
        )

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

    is_approved, reason, _ = evaluate_rules(
        parsed_data=parsed,
        db=db,
        telegram_msg_id=None,
        source_name=payload.source_name or "TEST_SOURCE",
        allow_internal_test=True,
    )
    if not is_approved:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Oferta rejeitada pelas regras de curadoria: {reason}",
        )

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
