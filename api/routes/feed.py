from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import case, desc

from database.connection import get_db
from database.models import User, UserPreference, Offer
from api.deps import get_current_user
from api.schemas.feed import FeedResponse
from api.schemas.favorite import OfferSummary

router = APIRouter(prefix="/feed", tags=["Feed Personalizado"])


@router.get("", response_model=FeedResponse)
def get_personalized_feed(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna ofertas publicadas ranqueadas com base nas preferências configuradas do usuário:
    - Prioriza produtos de categorias favoritas e lojas favoritas com desconto >= min_discount.
    - Fallback inteligente com ofertas populares e recentes quando o usuário possui poucas preferências.
    """
    pref = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()

    categories = pref.categories if pref and pref.categories else []
    stores = pref.stores if pref and pref.stores else []
    min_discount = pref.min_discount if pref else 0

    base_query = db.query(Offer).filter(Offer.status == "published")

    is_personalized = bool(categories or stores or min_discount > 0)

    if is_personalized:
        # Ponderação de relevância:
        # Categoria favorita: +2 pontos
        # Loja favorita: +2 pontos
        # Desconto acima do mínimo: +1 ponto
        category_conditions = [Offer.category.ilike(c) for c in categories] if categories else []
        store_conditions = [Offer.store.ilike(s) for s in stores] if stores else []

        score_category = case(
            (Offer.category.in_(categories), 2),
            else_=0
        ) if categories else 0

        score_store = case(
            (Offer.store.in_(stores), 2),
            else_=0
        ) if stores else 0

        score_discount = case(
            (Offer.discount_pct >= min_discount, 1),
            else_=0
        ) if min_discount > 0 else 0

        total_score = score_category + score_store + score_discount

        query = base_query.order_by(
            desc(total_score),
            desc(Offer.discount_pct),
            desc(Offer.published_at),
        )
    else:
        query = base_query.order_by(
            desc(Offer.discount_pct),
            desc(Offer.published_at),
        )

    total = query.count()
    offset = (page - 1) * limit
    items = query.offset(offset).limit(limit).all()
    has_more = offset + limit < total

    return FeedResponse(
        items=[OfferSummary.model_validate(item) for item in items],
        total=total,
        page=page,
        limit=limit,
        has_more=has_more,
        is_personalized=is_personalized,
    )
