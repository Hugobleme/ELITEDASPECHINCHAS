from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import User, UserPreference
from api.deps import get_current_user
from api.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_google_id_token,
)
from api.schemas.user import (
    UserRegister,
    UserLogin,
    UserGoogleAuth,
    RefreshTokenRequest,
    TokenResponse,
    UserRead,
)

router = APIRouter(prefix="", tags=["Autenticação & Perfil"])


@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    """
    Cria uma nova conta de usuário via e-mail e senha.
    Retorna access token e refresh token.
    """
    email_clean = payload.email.lower().strip()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma conta cadastrada com este endereço de e-mail.",
        )

    # Cria o usuário com hash seguro
    new_user = User(
        email=email_clean,
        name=payload.name.strip(),
        password_hash=get_password_hash(payload.password),
        provider="email",
    )
    db.add(new_user)
    db.flush()

    # Inicializa preferências vazias para o usuário
    default_prefs = UserPreference(
        user_id=new_user.id,
        categories=[],
        stores=[],
        min_discount=0,
    )
    db.add(default_prefs)
    db.commit()
    db.refresh(new_user)

    # Gera tokens JWT
    access_token = create_access_token({"sub": str(new_user.id), "email": new_user.email})
    refresh_token = create_refresh_token({"sub": str(new_user.id), "email": new_user.email})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """
    Autentica usuário existente via e-mail e senha.
    Retorna access token e refresh token.
    """
    email_clean = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()

    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token({"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token({"sub": str(user.id), "email": user.email})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/auth/google", response_model=TokenResponse)
def google_auth(payload: UserGoogleAuth, db: Session = Depends(get_db)):
    """
    Autentica ou cadastra usuário automaticamente através do Google ID Token.
    """
    try:
        google_data = verify_google_id_token(payload.id_token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Falha na validação com o Google: {str(e)}",
        )

    email = google_data["email"].lower().strip()
    name = google_data.get("name", email.split("@")[0])

    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Cadastra novo usuário Google
        user = User(
            email=email,
            name=name,
            provider="google",
            password_hash=None,
        )
        db.add(user)
        db.flush()

        default_prefs = UserPreference(
            user_id=user.id,
            categories=[],
            stores=[],
            min_discount=0,
        )
        db.add(default_prefs)
        db.commit()
        db.refresh(user)

    access_token = create_access_token({"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token({"sub": str(user.id), "email": user.email})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/auth/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Renova o access token utilizando o refresh token válido.
    """
    try:
        decoded = decode_token(payload.refresh_token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

    if decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido. É obrigatório fornecer um refresh token.",
        )

    user_id = decoded.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário associado ao token não existe.",
        )

    new_access_token = create_access_token({"sub": str(user.id), "email": user.email})
    # Mantém o refresh token existente ou pode rotacionar
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=payload.refresh_token,
    )


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Retorna os dados do perfil do usuário autenticado.
    """
    return current_user
