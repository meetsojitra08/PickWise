from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from app.core.response import PaginationLinks, PaginationMeta


class ReviewPayload(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    title: str = Field(..., min_length=2, max_length=150)
    body: str = Field(..., min_length=5, max_length=5000)


class ReviewOut(BaseModel):
    id: int
    rating: int
    title: str
    body: str
    status: str
    author_name: str
    is_own: bool = False
    created_at: Optional[str] = None


class ProductReviewsMeta(PaginationMeta):
    rating_distribution: Dict[int, int]
    own_pending_review: Optional[ReviewOut] = None
    has_reviewed: bool = False


class ProductReviewsResponse(BaseModel):
    data: List[ReviewOut]
    meta: ProductReviewsMeta
    links: Optional[PaginationLinks] = None
