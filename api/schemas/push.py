from pydantic import BaseModel, Field


class PushSubscriptionKeys(BaseModel):
    p256dh: str = Field(..., description="Chave pública P-256 do navegador")
    auth: str = Field(..., description="Segredo de autenticação da subscription")


class PushSubscriptionCreate(BaseModel):
    endpoint: str = Field(..., description="URL de endpoint do serviço de Push do navegador")
    keys: PushSubscriptionKeys


class PushSubscriptionDelete(BaseModel):
    endpoint: str
