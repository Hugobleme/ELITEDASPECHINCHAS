"""
Rotas públicas e administrativas de ofertas, cupons, categorias, lojas, busca e tracking.
"""
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from database.connection import get_db
from database.models import Offer, Coupon, Category, Store
from api.schemas.offer import (
    OfferRead,
    OffersPaginatedResponse,
    OfferCreate,
    OfferUpdate,
    CouponRead,
    CouponCreate,
    CouponsPaginatedResponse,
    CategoryDetail,
    CategoryCreate,
    StoreDetail,
    StoreCreate,
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
    query = db.query(Offer).filter(Offer.status == "published", Offer.is_active == True)

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
        .filter(Offer.id == offer_id, Offer.status == "published", Offer.is_active == True)
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
    """Remove uma oferta pelo ID (soft delete via is_active=False)."""
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta não encontrada.")

    offer.is_active = False
    offer.status = "deleted"
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
            Offer.is_active == True,
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
    Consulta o banco de dados e utiliza fallback estruturado caso a tabela esteja vazia.
    """
    query = db.query(Coupon).filter(Coupon.is_active == True)

    if store and store.lower() != "todas":
        st = store.lower()
        query = query.filter(Coupon.store.ilike(f"%{st}%") | Coupon.store_slug.ilike(f"%{st}%"))

    if category and category.lower() != "todas":
        query = query.filter(Coupon.category.ilike(category) | Coupon.category.ilike("todas"))

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            Coupon.code.ilike(s)
            | Coupon.store.ilike(s)
            | Coupon.description.ilike(s)
            | Coupon.discount_text.ilike(s)
        )

    db_total = query.count()
    if db_total > 0:
        offset = (page - 1) * limit
        items = query.order_by(desc(Coupon.created_at)).offset(offset).limit(limit).all()
        return {
            "items": items,
            "total": db_total,
            "page": page,
            "limit": limit,
            "has_more": offset + limit < db_total,
        }

    # Fallback para base mockada integrada
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
def get_coupon_by_id(coupon_id: str, db: Session = Depends(get_db)):
    """Busca cupom específico pelo identificador ou código."""
    cp = db.query(Coupon).filter(
        (Coupon.id == coupon_id) | (Coupon.code.ilike(coupon_id)),
        Coupon.is_active == True,
    ).first()
    if cp:
        return cp

    for c in PYTHON_MOCK_COUPONS:
        if c["id"] == coupon_id or c["code"].lower() == coupon_id.lower():
            return c
    raise HTTPException(status_code=404, detail="Cupom não encontrado.")


@router.post("/coupons", response_model=CouponRead, status_code=status.HTTP_201_CREATED)
def create_coupon(payload: CouponCreate, db: Session = Depends(get_db)):
    """Cria um novo cupom de desconto no banco de dados."""
    coupon_id = f"c-{uuid.uuid4().hex[:8]}"
    store_slug = payload.store_slug or payload.store.lower().replace(" ", "-")
    cp = Coupon(
        id=coupon_id,
        code=payload.code.upper(),
        store=payload.store,
        store_slug=store_slug,
        discount_text=payload.discount_text,
        description=payload.description,
        category=payload.category,
        valid_until=payload.valid_until,
        affiliate_link=payload.affiliate_link,
        is_verified=payload.is_verified,
        is_active=payload.is_active,
    )
    db.add(cp)
    db.commit()
    db.refresh(cp)
    return cp


@router.delete("/coupons/{coupon_id}", status_code=status.HTTP_200_OK)
def delete_coupon(coupon_id: str, db: Session = Depends(get_db)):
    """Desativa um cupom pelo ID (soft delete via is_active=False)."""
    cp = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not cp:
        raise HTTPException(status_code=404, detail="Cupom não encontrado.")
    cp.is_active = False
    db.commit()
    return {"status": "success", "deleted_id": coupon_id}


# ==============================================================================
# 4. Categorias e Lojas (com Slugs)
# ==============================================================================

@router.get("/categories", response_model=List[CategoryDetail])
def get_categories(db: Session = Depends(get_db)):
    """Retorna lista de categorias com contagem de ofertas publicadas."""
    db_cats = db.query(Category).all()
    if db_cats:
        res = []
        for cat in db_cats:
            count = (
                db.query(func.count(Offer.id))
                .filter(Offer.status == "published", Offer.is_active == True, Offer.category.ilike(cat.slug))
                .scalar() or 0
            )
            res.append({
                "name": cat.name,
                "slug": cat.slug,
                "count": count,
                "description": cat.description,
            })
        return res

    db_results = (
        db.query(Offer.category, func.count(Offer.id))
        .filter(Offer.status == "published", Offer.is_active == True)
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
    cat = db.query(Category).filter(Category.slug == clean_slug).first()
    if cat:
        count = (
            db.query(func.count(Offer.id))
            .filter(Offer.status == "published", Offer.is_active == True, Offer.category.ilike(clean_slug))
            .scalar() or 0
        )
        return {
            "name": cat.name,
            "slug": cat.slug,
            "count": count,
            "description": cat.description,
        }

    for c in PYTHON_MOCK_CATEGORIES:
        if c["slug"] == clean_slug:
            count = (
                db.query(func.count(Offer.id))
                .filter(Offer.status == "published", Offer.is_active == True, Offer.category.ilike(clean_slug))
                .scalar()
                or c["count"]
            )
            return {
                "name": c["name"],
                "slug": c["slug"],
                "count": count,
                "description": c.get("description"),
            }
    raise HTTPException(status_code=404, detail=f"Categoria '{slug}' não encontrada.")


@router.post("/categories", response_model=CategoryDetail, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    """Cadastra uma nova categoria no banco de dados."""
    existing = db.query(Category).filter(Category.slug == payload.slug.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Categoria com este slug já existe.")
    cat = Category(
        name=payload.name,
        slug=payload.slug.lower(),
        description=payload.description,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {"name": cat.name, "slug": cat.slug, "count": 0, "description": cat.description}


@router.get("/stores", response_model=List[StoreDetail])
def get_stores(db: Session = Depends(get_db)):
    """Retorna lista de lojas parceiras com contagem de ofertas publicadas."""
    db_stores = db.query(Store).filter(Store.is_trusted == True).all()
    if db_stores:
        res = []
        for st in db_stores:
            count = (
                db.query(func.count(Offer.id))
                .filter(Offer.status == "published", Offer.is_active == True, Offer.store.ilike(f"%{st.name}%"))
                .scalar() or 0
            )
            res.append({
                "name": st.name,
                "slug": st.slug,
                "count": count,
                "url": st.website_url,
            })
        return res

    db_results = (
        db.query(Offer.store, func.count(Offer.id))
        .filter(Offer.status == "published", Offer.is_active == True)
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
    st = db.query(Store).filter(Store.slug == clean_slug).first()
    if st:
        count = (
            db.query(func.count(Offer.id))
            .filter(Offer.status == "published", Offer.is_active == True, Offer.store.ilike(f"%{st.name}%"))
            .scalar() or 0
        )
        return {
            "name": st.name,
            "slug": st.slug,
            "count": count,
            "url": st.website_url,
        }

    for item in PYTHON_MOCK_STORES:
        if item["slug"] == clean_slug or item["name"].lower().replace(" ", "-") == clean_slug:
            count = (
                db.query(func.count(Offer.id))
                .filter(Offer.status == "published", Offer.is_active == True, Offer.store.ilike(f"%{item['name']}%"))
                .scalar()
                or item["count"]
            )
            return {
                "name": item["name"],
                "slug": item["slug"],
                "count": count,
                "url": item.get("url"),
            }
    raise HTTPException(status_code=404, detail=f"Loja '{slug}' não encontrada.")


@router.post("/stores", response_model=StoreDetail, status_code=status.HTTP_201_CREATED)
def create_store(payload: StoreCreate, db: Session = Depends(get_db)):
    """Cadastra uma nova loja parceira no banco de dados."""
    existing = db.query(Store).filter(Store.slug == payload.slug.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Loja com este slug já existe.")
    st = Store(
        name=payload.name,
        slug=payload.slug.lower(),
        logo_url=payload.logo_url,
        website_url=payload.website_url,
        is_trusted=payload.is_trusted,
    )
    db.add(st)
    db.commit()
    db.refresh(st)
    return {"name": st.name, "slug": st.slug, "count": 0, "url": st.website_url}


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
