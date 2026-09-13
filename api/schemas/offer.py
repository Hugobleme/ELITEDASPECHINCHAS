from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class OfferRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    price_current: float
    price_original: float
    discount_pct: int
    store: str
    category: str
    image_url: str
    original_link: Optional[str] = None
    affiliate_link: str
    coupon_code: Optional[str] = None
    status: str
    published_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class OffersPaginatedResponse(BaseModel):
    items: List[OfferRead]
    total: int
    page: int
    limit: int
    has_more: bool


class TestOfferIngestRequest(BaseModel):
    """
    Payload seguro para teste controlado do fluxo completo em ambiente dev/staging.
    Pode aceitar texto bruto simulando mensagem do Telegram ou campos estruturados.
    """
    raw_text: Optional[str] = Field(None, description="Texto simulando mensagem capturada do Telegram")
    title: Optional[str] = None
    price_current: Optional[float] = None
    price_original: Optional[float] = None
    discount_pct: Optional[int] = None
    store: Optional[str] = None
    category: Optional[str] = None
    original_link: Optional[str] = None
    coupon_code: Optional[str] = None
    source_name: Optional[str] = Field("TEST_SOURCE", description="Nome da fonte para validação")
