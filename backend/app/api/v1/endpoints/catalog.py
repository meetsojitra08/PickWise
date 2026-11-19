from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.response import ApiResponse, PaginatedResponse, PaginationLinks, PaginationMeta
from app.db.session import get_db
from app.schemas.catalog import (
    CategoryFiltersOut,
    CategoryOut,
    ProductCardOut,
    ProductDetailOut,
    ProductPriceHistoryOut,
)
from app.services.search import CatalogService

router = APIRouter()


@router.get("/categories", response_model=ApiResponse[list[CategoryOut]])
async def list_categories(db: AsyncSession = Depends(get_db)):
    tree = await CatalogService.get_categories_tree(db)
    return ApiResponse(data=tree)


@router.get("/categories/{slug}/filters", response_model=ApiResponse[CategoryFiltersOut])
async def get_category_filters(slug: str, db: AsyncSession = Depends(get_db)):
    filters = await CatalogService.get_category_filters(db, slug)
    return ApiResponse(data=filters)


@router.get("/products", response_model=PaginatedResponse[ProductCardOut])
async def search_products(
    request: Request,
    q: str | None = Query(None),
    category: str | None = Query(None),
    price_min: float | None = Query(None),
    price_max: float | None = Query(None),
    rating_min: float | None = Query(None),
    availability: str | None = Query(None),
    sort: str = Query("relevance"),
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    brand_slugs: list[str] = []
    spec_filters: dict[str, str] = {}

    for k, v in request.query_params.multi_items():
        if k in ("brand", "brand[]"):
            if v and v.strip():
                brand_slugs.append(v.strip().lower())
        elif k.startswith("spec[") and k.endswith("]"):
            spec_key = k[5:-1].strip()
            if spec_key and v:
                spec_filters[spec_key] = v.strip()

    cards, total, last_page = await CatalogService.search_products(
        db=db,
        query_text=q,
        category_slug=category,
        brand_slugs=brand_slugs if brand_slugs else None,
        price_min=price_min,
        price_max=price_max,
        rating_min=rating_min,
        availability=availability,
        spec_filters=spec_filters if spec_filters else None,
        sort=sort,
        page=page,
        per_page=per_page,
    )

    base_url = str(request.url).split("?")[0]
    query_dict = dict(request.query_params)

    def page_url(p: int) -> str:
        qd = dict(query_dict)
        qd["page"] = str(p)
        from urllib.parse import urlencode

        return f"{base_url}?{urlencode(qd)}"

    links = PaginationLinks(
        first=page_url(1),
        last=page_url(last_page),
        prev=page_url(page - 1) if page > 1 else None,
        next=page_url(page + 1) if page < last_page else None,
    )

    return PaginatedResponse(
        data=cards,
        meta=PaginationMeta(
            current_page=page,
            per_page=per_page,
            total=total,
            last_page=last_page,
        ),
        links=links,
    )


@router.get("/products/{slug}", response_model=ApiResponse[ProductDetailOut])
async def get_product_detail(slug: str, db: AsyncSession = Depends(get_db)):
    product = await CatalogService.get_product_detail(db, slug)
    return ApiResponse(data=product)


@router.get("/products/{slug}/price-history", response_model=ApiResponse[ProductPriceHistoryOut])
async def get_product_price_history(slug: str, db: AsyncSession = Depends(get_db)):
    history = await CatalogService.get_price_history(db, slug)
    return ApiResponse(data=history)


@router.get("/products/{slug}/similar", response_model=ApiResponse[list[ProductCardOut]])
async def get_similar_products(slug: str, db: AsyncSession = Depends(get_db)):
    similar = await CatalogService.get_similar_products(db, slug)
    return ApiResponse(data=similar)
