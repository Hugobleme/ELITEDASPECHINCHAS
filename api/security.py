import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET = os.getenv("JWT_SECRET", "super_secret_promoradar_jwt_key_2026")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TTL_MINUTES = int(os.getenv("JWT_ACCESS_TTL", "30"))  # 30 minutos
JWT_REFRESH_TTL_DAYS = int(os.getenv("JWT_REFRESH_TTL", "30"))   # 30 dias
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Valida uma senha em texto plano contra o hash bcrypt salvo no banco."""
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Gera um hash bcrypt seguro para a senha."""
    return pwd_context.hash(password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Cria um token JWT de acesso de curta duração (30 minutos)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=JWT_ACCESS_TTL_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Cria um token JWT de renovação de longa duração (30 dias)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=JWT_REFRESH_TTL_DAYS))
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    """Decodifica e valida assinatura e expiração do JWT."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError as e:
        raise ValueError(f"Token inválido ou expirado: {str(e)}")


def verify_google_id_token(id_token_str: str) -> Dict[str, Any]:
    """
    Valida um Google ID Token gerado no front-end.
    Retorna o payload com email, name, sub e picture.
    """
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests

        request = requests.Request()
        client_id = GOOGLE_CLIENT_ID or None
        id_info = id_token.verify_oauth2_token(id_token_str, request, client_id)

        if "email" not in id_info:
            raise ValueError("O token do Google não contém endereço de e-mail.")

        return id_info
    except Exception as e:
        # Modo simulação/mock para testes ou desenvolvimento sem credenciais ativas do GCP
        if id_token_str.startswith("mock_google_"):
            email_part = id_token_str.replace("mock_google_", "")
            return {
                "email": f"{email_part}@gmail.com",
                "name": email_part.capitalize(),
                "sub": f"google_sub_{email_part}",
                "picture": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
            }
        raise ValueError(f"Falha ao validar id_token do Google: {str(e)}")
