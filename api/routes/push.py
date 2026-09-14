import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import User, PushSubscription
from api.deps import get_current_user
from api.schemas.push import PushSubscriptionCreate, PushSubscriptionDelete

router = APIRouter(prefix="/me/push", tags=["Notificações Web Push"])


@router.get("/vapid-public-key", status_code=status.HTTP_200_OK)
def get_vapid_public_key():
    """
    Retorna a chave pública VAPID para registro no navegador.
    Segredos privados nunca são expostos.
    """
    return {"vapid_public_key": os.getenv("VAPID_PUBLIC_KEY", "")}


@router.post("/subscribe", status_code=status.HTTP_201_CREATED)
def subscribe_push(
    payload: PushSubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cadastra ou atualiza uma inscrição Web Push (endpoint, chaves p256dh e auth) para o usuário autenticado.
    """
    existing = (
        db.query(PushSubscription)
        .filter(
            PushSubscription.user_id == current_user.id,
            PushSubscription.endpoint == payload.endpoint,
        )
        .first()
    )

    if existing:
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        db.commit()
        return {"status": "updated", "message": "Inscrição Web Push atualizada com sucesso."}

    sub = PushSubscription(
        user_id=current_user.id,
        endpoint=payload.endpoint,
        p256dh=payload.keys.p256dh,
        auth=payload.keys.auth,
    )
    db.add(sub)
    db.commit()

    return {"status": "created", "message": "Inscrição Web Push registrada com sucesso."}


@router.delete("/subscribe", status_code=status.HTTP_200_OK)
def unsubscribe_push(
    payload: PushSubscriptionDelete,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Remove uma inscrição Web Push existente do usuário.
    """
    sub = (
        db.query(PushSubscription)
        .filter(
            PushSubscription.user_id == current_user.id,
            PushSubscription.endpoint == payload.endpoint,
        )
        .first()
    )

    if sub:
        db.delete(sub)
        db.commit()
        return {"status": "deleted", "message": "Inscrição Web Push removida."}

    return {"status": "not_found", "message": "Inscrição não encontrada."}
