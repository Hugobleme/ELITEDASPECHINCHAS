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


class OfferCreate(BaseModel):
    title: str = Field(..., min_length=3)
    price_current: float = Field(..., gt=0)
    price_original: Optional[float] = None
    discount_pct: Optional[int] = None
    store: str = Field(..., min_length=2)
    category: str = "eletronicos"
    image_url: Optional[str] = None
    original_link: str = Field(..., pattern="^https?://")
    affiliate_link: Optional[str] = None
    coupon_code: Optional[str] = None
    status: str = "published"


class OfferUpdate(BaseModel):
    title: Optional[str] = None
    price_current: Optional[float] = None
    price_original: Optional[float] = None
    discount_pct: Optional[int] = None
    store: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    original_link: Optional[str] = None
    affiliate_link: Optional[str] = None
    coupon_code: Optional[str] = None
    status: Optional[str] = None


class CouponRead(BaseModel):
    id: str
    code: str
    store: str
    store_slug: Optional[str] = None
    discount_text: str
    description: Optional[str] = None
    category: str
    valid_until: str
    affiliate_link: Optional[str] = None
    is_verified: bool = True


class CouponsPaginatedResponse(BaseModel):
    items: List[CouponRead]
    total: int
    page: int
    limit: int
    has_more: bool


class CategoryDetail(BaseModel):
    name: str
    slug: str
    count: int
    description: Optional[str] = None


class StoreDetail(BaseModel):
    name: str
    slug: str
    count: int
    url: Optional[str] = None


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


class CouponCreate(BaseModel):
    code: str = Field(..., min_length=2)
    store: str = Field(..., min_length=2)
    store_slug: Optional[str] = None
    discount_text: str = Field(..., min_length=2)
    description: Optional[str] = None
    category: str = "todas"
    valid_until: str = "Indeterminado"
    affiliate_link: Optional[str] = None
    is_verified: bool = True
    is_active: bool = True


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2)
    slug: str = Field(..., min_length=2)
    description: Optional[str] = None


class StoreCreate(BaseModel):
    name: str = Field(..., min_length=2)
    slug: str = Field(..., min_length=2)
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    is_trusted: bool = True

