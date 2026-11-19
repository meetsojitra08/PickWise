from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, get_optional_user
from app.core.response import ApiResponse
from app.db.session import get_db
from app.models import User
from app.schemas.reviews import (
    ProductReviewsResponse,
    ReviewOut,
    ReviewPayload,
)
from app.services.reviews import ReviewService

router = APIRouter()


@router.get("/products/{slug}/reviews", response_model=ProductReviewsResponse)
async def list_product_reviews(
    slug: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    return await ReviewService.get_product_reviews(
        db=db,
        slug=slug,
        page=page,
        per_page=per_page,
        current_user=current_user,
    )


@router.post(
    "/products/{slug}/reviews",
    response_model=ApiResponse[ReviewOut],
    status_code=status.HTTP_201_CREATED,
)
async def create_product_review(
    slug: str,
    payload: ReviewPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    review = await ReviewService.create_review(
        db=db,
        slug=slug,
        user=current_user,
        payload=payload,
    )
    return ApiResponse(data=review)


@router.patch("/reviews/{id}", response_model=ApiResponse[ReviewOut])
async def update_review(
    id: int,
    payload: ReviewPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    review = await ReviewService.update_review(
        db=db,
        review_id=id,
        user=current_user,
        payload=payload,
    )
    return ApiResponse(data=review)


@router.delete("/reviews/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ReviewService.delete_review(
        db=db,
        review_id=id,
        user=current_user,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
