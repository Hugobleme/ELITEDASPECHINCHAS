from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class UserPreferenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    categories: List[str] = Field(default_factory=list, description="Lista de categorias favoritas")
    stores: List[str] = Field(default_factory=list, description="Lista de lojas favoritas")
    min_discount: int = Field(default=0, ge=0, le=95, description="Desconto mínimo padrão desejado")


class UserPreferenceUpdate(BaseModel):
    categories: Optional[List[str]] = None
    stores: Optional[List[str]] = None
    min_discount: Optional[int] = Field(None, ge=0, le=95)
