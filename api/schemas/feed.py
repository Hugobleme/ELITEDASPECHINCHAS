from typing import List
from pydantic import BaseModel
from api.schemas.favorite import OfferSummary


class FeedResponse(BaseModel):
    items: List[OfferSummary]
    total: int
    page: int
    limit: int
    has_more: bool
    is_personalized: bool
