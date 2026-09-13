from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class OfferSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    price_current: float
    price_original: float
    discount_pct: int
    store: str
    category: str
    image_url: str
    affiliate_link: str
    status: str
    published_at: Optional[datetime] = None


class FavoriteCreate(BaseModel):
    offer_id: str


class FavoriteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    offer_id: str
    created_at: datetime
    offer: Optional[OfferSummary] = None
