from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.auth import get_current_user
from app.core.response import ApiResponse, PaginatedResponse, PaginationLinks, PaginationMeta
from app.db.session import get_db
from app.models import User
from app.schemas.wishlist import WishlistItemOut, WishlistStorePayload
from app.services.wishlist import WishlistService

router = APIRouter()


@router.get("/wishlist", response_model=PaginatedResponse[WishlistItemOut])
async def get_wishlist(
    page: int = Query(1, ge=1),
    per_page: int = Query(48, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total, last_page = await WishlistService.get_wishlist(
        db=db,
        user=current_user,
        page=page,
        per_page=per_page,
    )
    return PaginatedResponse(
        data=items,
        meta=PaginationMeta(
            current_page=page,
            per_page=per_page,
            total=total,
            last_page=last_page,
        ),
        links=PaginationLinks(
            first=f"/api/v1/wishlist?page=1&per_page={per_page}",
            last=f"/api/v1/wishlist?page={last_page}&per_page={per_page}",
            prev=f"/api/v1/wishlist?page={page - 1}&per_page={per_page}" if page > 1 else None,
            next=f"/api/v1/wishlist?page={page + 1}&per_page={per_page}" if page < last_page else None,
        ),
    )


@router.post("/wishlist", response_model=ApiResponse[WishlistItemOut])
async def add_wishlist_item(
    payload: WishlistStorePayload,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item, was_created = await WishlistService.add_item(
        db=db,
        user=current_user,
        product_id=payload.product_id,
    )
    if was_created:
        response.status_code = status.HTTP_201_CREATED
    return ApiResponse(data=item)


@router.delete("/wishlist/{productId}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_wishlist_item(
    productId: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await WishlistService.remove_item(
        db=db,
        user=current_user,
        product_id=productId,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
