from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import User, PriceAlert
from api.deps import get_current_user
from api.schemas.alert import PriceAlertCreate, PriceAlertRead

router = APIRouter(prefix="/me/alerts", tags=["Alertas de Preço"])


@router.get("", response_model=List[PriceAlertRead])
def list_my_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna todos os alertas de preço configurados pelo usuário.
    """
    alerts = (
        db.query(PriceAlert)
        .filter(PriceAlert.user_id == current_user.id)
        .order_by(PriceAlert.created_at.desc())
        .all()
    )
    return alerts


@router.post("", response_model=PriceAlertRead, status_code=status.HTTP_201_CREATED)
def create_alert(
    payload: PriceAlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cria um novo alerta de preço para o usuário.
    Critérios opcionais: categoria, loja e palavra-chave no título, com desconto mínimo.
    """
    keyword_clean = payload.keyword.strip() if payload.keyword else None
    category_clean = payload.category.lower().strip() if payload.category else None
    store_clean = payload.store.strip() if payload.store else None

    # Validação mínima: deve ter pelo menos um critério ou desconto alvo
    if not any([keyword_clean, category_clean, store_clean]) and payload.target_discount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe pelo menos uma categoria, loja, palavra-chave ou desconto mínimo para o alerta.",
        )

    alert = PriceAlert(
        user_id=current_user.id,
        category=category_clean,
        store=store_clean,
        keyword=keyword_clean,
        target_discount=payload.target_discount,
        active=True,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Remove um alerta de preço do usuário.
    Lança HTTP 404 Not Found se o alerta não for encontrado ou não pertencer ao usuário.
    """
    alert = (
        db.query(PriceAlert)
        .filter(PriceAlert.id == alert_id, PriceAlert.user_id == current_user.id)
        .first()
    )
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alerta de preço não encontrado.",
        )

    db.delete(alert)
    db.commit()
    return None
