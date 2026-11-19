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
    created_at: str | None = None


class ProductReviewsMeta(PaginationMeta):
    rating_distribution: dict[int, int]
    own_pending_review: ReviewOut | None = None
    has_reviewed: bool = False


class ProductReviewsResponse(BaseModel):
    data: list[ReviewOut]
    meta: ProductReviewsMeta
    links: PaginationLinks | None = None
