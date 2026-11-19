from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel
from app.core.response import MoneyAmount


def format_media_url(path: Optional[str]) -> Optional[str]:
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
    parent_id: Optional[int] = None
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: int = 0
    products_count: Optional[int] = None
    children: Optional[List["CategoryOut"]] = None


class BrandOut(BaseModel):
    id: int
    name: str
    slug: str
    logo_url: Optional[str] = None


class PrimaryImageOut(BaseModel):
    id: int
    url: Optional[str] = None
    alt_text: str


class ProductImageOut(BaseModel):
    id: int
    url: Optional[str] = None
    alt_text: str
    sort_order: int
    is_primary: bool


class ProductSpecOut(BaseModel):
    key: str
    label: str
    unit: Optional[str] = None
    data_type: str
    value: Any
    is_comparable: bool = False
    higher_is_better: Optional[bool] = None


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
    value_score: Optional[int] = None
    category: Optional[Dict[str, Any]] = None
    brand: Optional[BrandOut] = None
    primary_image: Optional[PrimaryImageOut] = None


class ReviewSummaryOut(BaseModel):
    summary: str
    pros: List[str]
    cons: List[str]
    sentiment: str
    reviews_count: int
    generated_at: str


class ProductDetailOut(BaseModel):
    id: int
    name: str
    slug: str
    summary: str
    description: Optional[str] = None
    price: MoneyAmount
    availability: str
    availability_label: str
    store_url: Optional[str] = None
    rating_avg: float
    rating_count: int
    value_score: Optional[int] = None
    category: Optional[Dict[str, Any]] = None
    brand: Optional[BrandOut] = None
    primary_image: Optional[PrimaryImageOut] = None
    images: List[ProductImageOut] = []
    specs: List[ProductSpecOut] = []
    review_summary: Optional[ReviewSummaryOut] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class PriceHistoryPointOut(BaseModel):
    recorded_at: str
    price: MoneyAmount


class ProductPriceHistoryOut(BaseModel):
    currency: str
    points: List[PriceHistoryPointOut] = []


class BrandFacetOut(BaseModel):
    id: int
    name: str
    slug: str
    logo_url: Optional[str] = None
    products_count: int


class AvailabilityFacetOut(BaseModel):
    value: str
    label: str
    products_count: int


class NumericRange(BaseModel):
    min: Optional[float] = None
    max: Optional[float] = None


class SpecOptionFacetOut(BaseModel):
    value: Union[str, bool, int, float]
    label: str
    products_count: int


class SpecFacetOut(BaseModel):
    key: str
    label: str
    unit: Optional[str] = None
    data_type: str
    range: Optional[NumericRange] = None
    options: Optional[List[SpecOptionFacetOut]] = None


class PriceRangeFacetOut(BaseModel):
    min: Optional[MoneyAmount] = None
    max: Optional[MoneyAmount] = None


class CategoryFiltersOut(BaseModel):
    category: CategoryOut
    price_range: PriceRangeFacetOut
    brands: List[BrandFacetOut] = []
    availability: List[AvailabilityFacetOut] = []
    specs: List[SpecFacetOut] = []
