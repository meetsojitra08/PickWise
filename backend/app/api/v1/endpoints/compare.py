from typing import Dict, Optional
from fastapi import APIRouter, Depends, Query, Request, Response, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.auth import get_current_user, get_optional_user
from app.core.response import ApiResponse, PaginatedResponse, PaginationLinks, PaginationMeta
from app.db.session import get_db, get_redis_client
from app.models import User
from app.schemas.assistant import CompareVerdictOut, CompareVerdictPayload
from app.schemas.compare import (
    CompareMatrixData,
    CompareRequestPayload,
    CreateComparisonPayload,
    SavedComparisonDetailOut,
    SavedComparisonOut,
    SharedComparisonOut,
    UpdateComparisonPayload,
)
from app.services.compare import CompareService
from app.services.verdict import VerdictService

router = APIRouter()


@router.post("/compare", response_model=ApiResponse[CompareMatrixData])
async def compare_matrix(
    payload: CompareRequestPayload,
    db: AsyncSession = Depends(get_db),
):
    matrix = await CompareService.build_compare_matrix(db, payload.product_ids)
    return ApiResponse(data=matrix)


@router.post("/compare/verdict", response_model=ApiResponse[CompareVerdictOut])
async def compare_verdict(
    payload: CompareVerdictPayload,
    request: Request,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    redis = get_redis_client()
    verdict = await VerdictService.generate_verdict(
        db=db,
        redis=redis,
        request=request,
        product_ids=payload.product_ids,
        priority=payload.priority,
        comparison_id=payload.comparison_id,
        user=current_user,
    )
    return ApiResponse(data=verdict)


@router.get("/comparisons", response_model=PaginatedResponse[SavedComparisonOut])
async def list_comparisons(
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total, last_page = await CompareService.list_user_comparisons(
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
            first=f"/api/v1/comparisons?page=1&per_page={per_page}",
            last=f"/api/v1/comparisons?page={last_page}&per_page={per_page}",
            prev=f"/api/v1/comparisons?page={page - 1}&per_page={per_page}" if page > 1 else None,
            next=f"/api/v1/comparisons?page={page + 1}&per_page={per_page}" if page < last_page else None,
        ),
    )


@router.post("/comparisons", response_model=ApiResponse[SavedComparisonDetailOut], status_code=status.HTTP_201_CREATED)
async def create_comparison(
    payload: CreateComparisonPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    detail = await CompareService.create_comparison(
        db=db,
        user=current_user,
        name=payload.name,
        product_ids=payload.product_ids,
        ai_verdict=payload.ai_verdict,
    )
    return ApiResponse(data=detail)


@router.get("/comparisons/{id}", response_model=ApiResponse[SavedComparisonDetailOut])
async def get_comparison(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    detail = await CompareService.get_comparison_detail(db, id, current_user)
    return ApiResponse(data=detail)


@router.patch("/comparisons/{id}", response_model=ApiResponse[SavedComparisonDetailOut])
async def update_comparison(
    id: int,
    payload: UpdateComparisonPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    detail = await CompareService.update_comparison(
        db=db,
        comparison_id=id,
        user=current_user,
        name=payload.name,
        product_ids=payload.product_ids,
    )
    return ApiResponse(data=detail)


@router.delete("/comparisons/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comparison(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await CompareService.delete_comparison(db, id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/comparisons/{id}/share", response_model=ApiResponse[Dict[str, str]])
async def share_comparison(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    token = await CompareService.share_comparison(db, id, current_user)
    return ApiResponse(data={"share_token": token})


@router.delete("/comparisons/{id}/share", status_code=status.HTTP_204_NO_CONTENT)
async def stop_sharing_comparison(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await CompareService.stop_sharing_comparison(db, id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/shared/comparisons/{token}", response_model=ApiResponse[SharedComparisonOut])
async def get_shared_comparison(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    shared = await CompareService.get_shared_comparison(db, token)
    return ApiResponse(data=shared)
