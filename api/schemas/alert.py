from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class PriceAlertCreate(BaseModel):
    category: Optional[str] = Field(None, description="Filtrar por categoria específica")
    store: Optional[str] = Field(None, description="Filtrar por loja específica")
    keyword: Optional[str] = Field(None, description="Palavra-chave presente no título (ex: RTX 4060, Air Fryer, iPhone)")
    target_discount: int = Field(default=0, ge=0, le=95, description="Percentual de desconto mínimo para disparar o alerta")


class PriceAlertRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    category: Optional[str] = None
    store: Optional[str] = None
    keyword: Optional[str] = None
    target_discount: int
    active: bool
    created_at: datetime
