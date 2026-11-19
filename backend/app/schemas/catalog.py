from typing import Any

from pydantic import BaseModel

from app.core.response import MoneyAmount


def format_media_url(path: str | None) -> str | None:
    if not path:
        return None
    p = path.strip()
    if not p:
        return None
    if p.startswith(("http://", "https://", "/")):
        return p
    return f"/storage/{p.lstrip('/')}"


class CategoryOut(BaseModel):
    id: int
    parent_id: int | None = None
    name: str
    slug: str
    description: str | None = None
    image_url: str | None = None
    sort_order: int = 0
    products_count: int | None = None
    children: list["CategoryOut"] | None = None


class BrandOut(BaseModel):
    id: int
    name: str
    slug: str
    logo_url: str | None = None


class PrimaryImageOut(BaseModel):
    id: int
    url: str | None = None
    alt_text: str


class ProductImageOut(BaseModel):
    id: int
    url: str | None = None
    alt_text: str
    sort_order: int
    is_primary: bool


class ProductSpecOut(BaseModel):
    key: str
    label: str
    unit: str | None = None
    data_type: str
    value: Any
    is_comparable: bool = False
    higher_is_better: bool | None = None


class ProductCardOut(BaseModel):
    id: int
    name: str
    slug: str
    summary: str
    price: MoneyAmount
    availability: str
    availability_label: str
    rating_avg: float
    rating_count: int
    value_score: int | None = None
    category: dict[str, Any] | None = None
    brand: BrandOut | None = None
    primary_image: PrimaryImageOut | None = None


class ReviewSummaryOut(BaseModel):
    summary: str
    pros: list[str]
    cons: list[str]
    sentiment: str
    reviews_count: int
    generated_at: str


class ProductDetailOut(BaseModel):
    id: int
    name: str
    slug: str
    summary: str
    description: str | None = None
    price: MoneyAmount
    availability: str
    availability_label: str
    store_url: str | None = None
    rating_avg: float
    rating_count: int
    value_score: int | None = None
    category: dict[str, Any] | None = None
    brand: BrandOut | None = None
    primary_image: PrimaryImageOut | None = None
    images: list[ProductImageOut] = []
    specs: list[ProductSpecOut] = []
    review_summary: ReviewSummaryOut | None = None
    created_at: str | None = None
    updated_at: str | None = None


class PriceHistoryPointOut(BaseModel):
    recorded_at: str
    price: MoneyAmount


class ProductPriceHistoryOut(BaseModel):
    currency: str
    points: list[PriceHistoryPointOut] = []


class BrandFacetOut(BaseModel):
    id: int
    name: str
    slug: str
    logo_url: str | None = None
    products_count: int


class AvailabilityFacetOut(BaseModel):
    value: str
    label: str
    products_count: int


class NumericRange(BaseModel):
    min: float | None = None
    max: float | None = None


class SpecOptionFacetOut(BaseModel):
    value: str | bool | int | float
    label: str
    products_count: int


class SpecFacetOut(BaseModel):
    key: str
    label: str
    unit: str | None = None
    data_type: str
    range: NumericRange | None = None
    options: list[SpecOptionFacetOut] | None = None


class PriceRangeFacetOut(BaseModel):
    min: MoneyAmount | None = None
    max: MoneyAmount | None = None


class CategoryFiltersOut(BaseModel):
    category: CategoryOut
    price_range: PriceRangeFacetOut
    brands: list[BrandFacetOut] = []
    availability: list[AvailabilityFacetOut] = []
    specs: list[SpecFacetOut] = []
