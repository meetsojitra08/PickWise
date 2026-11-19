import os
import shutil
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, Form, Query, Request, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.auth import require_admin
from app.core.response import ApiResponse, PaginatedResponse, PaginationLinks, PaginationMeta
from app.db.session import get_db
from app.models import User
from app.schemas.admin import (
    AdminActivityItem,
    AdminAiUsageData,
    AdminBrand,
    AdminBrandFormData,
    AdminBulkStatusPayload,
    AdminCategory,
    AdminCategoryFormData,
    AdminDashboardData,
    AdminProduct,
    AdminProductFormData,
    AdminProductImage,
    AdminProductImageReorderPayload,
    AdminProductImageUpdatePayload,
    AdminReview,
    AdminSpecDefinition,
    AdminSpecDefinitionFormData,
    AdminUser,
    BulkModerateReviewsPayload,
    BulkModerateReviewsResponse,
    ModerateReviewPayload,
    RegenerateSummaryResponse,
    UpdateAdminUserPayload,
)
from app.services.admin import AdminService

router = APIRouter(prefix="/admin", dependencies=[Depends(require_admin)])


@router.get("/dashboard", response_model=ApiResponse[AdminDashboardData])
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    data = await AdminService.get_dashboard(db)
    return ApiResponse(data=data)


# ---------------- Categories ----------------
@router.get("/categories", response_model=PaginatedResponse[AdminCategory])
async def list_categories(
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    parent_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, total, last_page = await AdminService.list_categories(
        db, search=search, is_active=is_active, parent_id=parent_id, page=page, per_page=per_page
    )
    return PaginatedResponse(
        data=items,
        meta=PaginationMeta(current_page=page, per_page=per_page, total=total, last_page=last_page),
    )


@router.post("/categories", response_model=ApiResponse[AdminCategory], status_code=status.HTTP_201_CREATED)
async def create_category(
    data: AdminCategoryFormData,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    cat = await AdminService.create_category(db, admin, data)
    return ApiResponse(data=cat)


@router.patch("/categories/{id}", response_model=ApiResponse[AdminCategory])
async def update_category(
    id: int,
    data: Dict[str, Any],
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    cat = await AdminService.update_category(db, admin, id, data)
    return ApiResponse(data=cat)


@router.delete("/categories/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await AdminService.delete_category(db, admin, id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------- Category Specs ----------------
@router.get("/categories/{category_id}/specs", response_model=ApiResponse[List[AdminSpecDefinition]])
async def list_category_specs(
    category_id: int,
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    specs = await AdminService.list_category_specs(db, category_id, search=search)
    return ApiResponse(data=specs)


@router.post("/categories/{category_id}/specs", response_model=ApiResponse[AdminSpecDefinition], status_code=status.HTTP_201_CREATED)
async def create_category_spec(
    category_id: int,
    data: AdminSpecDefinitionFormData,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    spec = await AdminService.create_spec(db, admin, category_id, data)
    return ApiResponse(data=spec)


@router.patch("/categories/{category_id}/specs/{spec_id}", response_model=ApiResponse[AdminSpecDefinition])
async def update_category_spec(
    category_id: int,
    spec_id: int,
    data: Dict[str, Any],
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    spec = await AdminService.update_spec(db, admin, category_id, spec_id, data)
    return ApiResponse(data=spec)


@router.delete("/categories/{category_id}/specs/{spec_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category_spec(
    category_id: int,
    spec_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await AdminService.delete_spec(db, admin, category_id, spec_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------- Brands ----------------
@router.get("/brands", response_model=PaginatedResponse[AdminBrand])
async def list_brands(
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, total, last_page = await AdminService.list_brands(db, search=search, sort=sort, page=page, per_page=per_page)
    return PaginatedResponse(
        data=items,
        meta=PaginationMeta(current_page=page, per_page=per_page, total=total, last_page=last_page),
    )


@router.post("/brands", response_model=ApiResponse[AdminBrand], status_code=status.HTTP_201_CREATED)
async def create_brand(
    data: AdminBrandFormData,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    brand = await AdminService.create_brand(db, admin, data)
    return ApiResponse(data=brand)


@router.patch("/brands/{id}", response_model=ApiResponse[AdminBrand])
async def update_brand(
    id: int,
    data: Dict[str, Any],
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    brand = await AdminService.update_brand(db, admin, id, data)
    return ApiResponse(data=brand)


@router.delete("/brands/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand(
    id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await AdminService.delete_brand(db, admin, id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------- Products ----------------
@router.get("/products", response_model=PaginatedResponse[AdminProduct])
async def list_products(
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    brand_id: Optional[int] = Query(None),
    is_published: Optional[bool] = Query(None),
    availability: Optional[str] = Query(None),
    trashed: Optional[str] = Query(None),
    sort: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, total, last_page = await AdminService.list_products(
        db, search=search, category_id=category_id, brand_id=brand_id,
        is_published=is_published, availability=availability, trashed=trashed,
        sort=sort, page=page, per_page=per_page
    )
    return PaginatedResponse(
        data=items,
        meta=PaginationMeta(current_page=page, per_page=per_page, total=total, last_page=last_page),
    )


@router.get("/products/{id}", response_model=ApiResponse[AdminProduct])
async def get_product(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    p = await AdminService.get_product(db, id)
    return ApiResponse(data=p)


@router.post("/products", response_model=ApiResponse[AdminProduct], status_code=status.HTTP_201_CREATED)
async def create_product(
    data: AdminProductFormData,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    p = await AdminService.create_product(db, admin, data)
    return ApiResponse(data=p)


@router.patch("/products/bulk-status", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_update_product_status(
    payload: AdminBulkStatusPayload,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await AdminService.bulk_product_status(db, admin, payload.product_ids, payload.is_published)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/products/{id}", response_model=ApiResponse[AdminProduct])
async def update_product(
    id: int,
    data: Dict[str, Any],
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    p = await AdminService.update_product(db, admin, id, data)
    return ApiResponse(data=p)


@router.delete("/products/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await AdminService.delete_product(db, admin, id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------- Product Images ----------------
@router.get("/products/{product_id}/images", response_model=ApiResponse[List[AdminProductImage]])
async def list_product_images(
    product_id: int,
    db: AsyncSession = Depends(get_db),
):
    imgs = await AdminService.list_product_images(db, product_id)
    return ApiResponse(data=imgs)


@router.post("/products/{product_id}/images", response_model=ApiResponse[AdminProductImage], status_code=status.HTTP_201_CREATED)
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    alt_text: str = Form(""),
    is_primary: bool = Form(False),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Save file to storage/public/products
    storage_dir = os.path.join("storage", "public", "products")
    os.makedirs(storage_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    filepath = os.path.join(storage_dir, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    relative_path = f"products/{filename}"
    img = await AdminService.add_product_image(
        db, admin, product_id, path=relative_path, alt_text=alt_text, is_primary=is_primary
    )
    return ApiResponse(data=img)


@router.patch("/products/{product_id}/images/reorder", response_model=ApiResponse[List[AdminProductImage]])
async def reorder_product_images(
    product_id: int,
    payload: AdminProductImageReorderPayload,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    imgs = await AdminService.reorder_product_images(
        db, admin, product_id, image_ids=payload.image_ids, primary_id=payload.primary_id
    )
    return ApiResponse(data=imgs)


@router.patch("/products/{product_id}/images/{image_id}", response_model=ApiResponse[AdminProductImage])
async def update_product_image(
    product_id: int,
    image_id: int,
    payload: AdminProductImageUpdatePayload,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    img = await AdminService.update_product_image(
        db, admin, product_id, image_id,
        alt_text=payload.alt_text, is_primary=payload.is_primary, sort_order=payload.sort_order
    )
    return ApiResponse(data=img)


@router.delete("/products/{product_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_image(
    product_id: int,
    image_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await AdminService.delete_product_image(db, admin, product_id, image_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------- Users ----------------
@router.get("/users", response_model=PaginatedResponse[AdminUser])
async def list_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    sort: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, total, last_page = await AdminService.list_users(
        db, search=search, role=role, is_active=is_active, sort=sort, page=page, per_page=per_page
    )
    return PaginatedResponse(
        data=items,
        meta=PaginationMeta(current_page=page, per_page=per_page, total=total, last_page=last_page),
    )


@router.patch("/users/{user_id}", response_model=ApiResponse[AdminUser])
async def update_user(
    user_id: int,
    payload: UpdateAdminUserPayload,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    u = await AdminService.update_user(db, admin, user_id, is_active=payload.is_active, role=payload.role)
    return ApiResponse(data=u)


# ---------------- Reviews Moderation ----------------
@router.get("/reviews", response_model=PaginatedResponse[AdminReview])
async def list_reviews(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    rating: Optional[int] = Query(None),
    product_id: Optional[int] = Query(None),
    sort: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, total, last_page = await AdminService.list_reviews(
        db, status=status, search=search, rating=rating, product_id=product_id, sort=sort, page=page, per_page=per_page
    )
    return PaginatedResponse(
        data=items,
        meta=PaginationMeta(current_page=page, per_page=per_page, total=total, last_page=last_page),
    )


@router.patch("/reviews/bulk-status", response_model=ApiResponse[BulkModerateReviewsResponse])
async def bulk_moderate_reviews(
    payload: BulkModerateReviewsPayload,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    cnt = await AdminService.bulk_moderate_reviews(db, admin, payload.review_ids, payload.status)
    return ApiResponse(data=BulkModerateReviewsResponse(count=cnt, status=payload.status))


@router.patch("/reviews/{review_id}", response_model=ApiResponse[AdminReview])
async def moderate_review(
    review_id: int,
    payload: ModerateReviewPayload,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    r = await AdminService.moderate_review(db, admin, review_id, payload.status)
    return ApiResponse(data=r)


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await AdminService.delete_review(db, admin, review_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/products/{product_id}/regenerate-summary", response_model=ApiResponse[RegenerateSummaryResponse])
async def regenerate_summary(
    product_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await AdminService.regenerate_review_summary(db, admin, product_id)
    return ApiResponse(
        data=RegenerateSummaryResponse(
            product_id=product_id,
            queued=False,
            message="Review summary successfully regenerated.",
        )
    )


# ---------------- AI Usage & Activity Logs ----------------
@router.get("/ai/usage", response_model=ApiResponse[AdminAiUsageData])
async def get_ai_usage(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    feature: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    data = await AdminService.get_ai_usage(
        db, start_date=start_date, end_date=end_date, feature=feature,
        status=status, user_id=user_id, page=page, per_page=per_page
    )
    return ApiResponse(data=data)


@router.get("/activity-logs", response_model=PaginatedResponse[AdminActivityItem])
async def get_activity_logs(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    admin_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    subject_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, total, last_page = await AdminService.get_activity_logs(
        db, start_date=start_date, end_date=end_date, admin_id=admin_id,
        action=action, subject_type=subject_type, search=search, page=page, per_page=per_page
    )
    return PaginatedResponse(
        data=items,
        meta=PaginationMeta(current_page=page, per_page=per_page, total=total, last_page=last_page),
    )
