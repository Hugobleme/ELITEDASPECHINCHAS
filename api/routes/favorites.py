from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database.connection import get_db
from database.models import User, Favorite, Offer
from api.deps import get_current_user
from api.schemas.favorite import FavoriteCreate, FavoriteRead

router = APIRouter(prefix="/me/favorites", tags=["Favoritos"])


@router.get("", response_model=List[FavoriteRead])
def get_my_favorites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna a lista de todas as ofertas favoritadas pelo usuário com os dados do produto.
    """
    favorites = (
        db.query(Favorite)
        .options(joinedload(Favorite.offer))
        .filter(Favorite.user_id == current_user.id)
        .order_by(Favorite.created_at.desc())
        .all()
    )
    return favorites


@router.post("", response_model=FavoriteRead, status_code=status.HTTP_201_CREATED)
def add_favorite(
    payload: FavoriteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Adiciona uma oferta à lista de favoritos do usuário.
    Lança HTTP 409 Conflict caso a oferta já esteja favoritada.
    """
    # Verifica se a oferta existe
    offer = db.query(Offer).filter(Offer.id == payload.offer_id).first()
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="A oferta indicada não foi encontrada.",
        )

    # Verifica se já está favoritada
    existing = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.id, Favorite.offer_id == payload.offer_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta oferta já está nos seus favoritos.",
        )

    fav = Favorite(user_id=current_user.id, offer_id=payload.offer_id)
    db.add(fav)
    db.commit()
    db.refresh(fav)

    # Carrega relacionamento para retorno
    fav.offer = offer
    return fav


@router.delete("/{offer_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(
    offer_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Remove uma oferta da lista de favoritos do usuário.
    Lança HTTP 404 Not Found se a oferta não estiver nos favoritos.
    """
    fav = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.id, Favorite.offer_id == offer_id)
        .first()
    )
    if not fav:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Oferta não encontrada na lista de favoritos.",
        )

    db.delete(fav)
    db.commit()
    return None
