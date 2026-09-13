from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import User, UserPreference
from api.deps import get_current_user
from api.schemas.preference import UserPreferenceRead, UserPreferenceUpdate

router = APIRouter(prefix="/me/preferences", tags=["Preferências do Usuário"])


@router.get("", response_model=UserPreferenceRead)
def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna as preferências configuradas do usuário autenticado.
    """
    pref = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    if not pref:
        pref = UserPreference(user_id=current_user.id, categories=[], stores=[], min_discount=0)
        db.add(pref)
        db.commit()
        db.refresh(pref)

    return pref


@router.patch("", response_model=UserPreferenceRead)
def update_preferences(
    payload: UserPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Atualiza categorias favoritas, lojas favoritas ou desconto mínimo padrão.
    """
    pref = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    if not pref:
        pref = UserPreference(user_id=current_user.id, categories=[], stores=[], min_discount=0)
        db.add(pref)

    if payload.categories is not None:
        pref.categories = [c.lower().strip() for c in payload.categories]

    if payload.stores is not None:
        pref.stores = [s.strip() for s in payload.stores]

    if payload.min_discount is not None:
        pref.min_discount = payload.min_discount

    db.commit()
    db.refresh(pref)
    return pref
