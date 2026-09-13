from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict, Field


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Senha com no mínimo 6 caracteres")
    name: str = Field(..., min_length=2, description="Nome completo do usuário")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserGoogleAuth(BaseModel):
    id_token: str = Field(..., description="ID Token JWT emitido pelo Google Identity Services")


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 1800  # 30 minutos em segundos


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: str
    provider: str
    created_at: datetime
