from typing import Any

from pydantic import BaseModel, Field

from app.schemas.catalog import ProductCardOut


class CompareCategory(BaseModel):
    id: int
    name: str
    slug: str


class CompareRowValue(BaseModel):
    product_id: int
    value: str | int | float | bool | None = None


class CompareRow(BaseModel):
    key: str
    label: str
    unit: str | None = None
    data_type: str
    higher_is_better: bool | None = None
    winner_product_id: int | None = None
    values: list[CompareRowValue] = []


class CompareMatrixData(BaseModel):
    category: CompareCategory
    products: list[ProductCardOut] = []
    rows: list[CompareRow] = []


class CompareRequestPayload(BaseModel):
    product_ids: list[int] = Field(..., min_length=2, max_length=4)


class SavedComparisonOut(BaseModel):
    id: int
    name: str
    share_token: str | None = None
    is_shared: bool = False
    item_count: int
    unavailable_count: int = 0
    items: list[ProductCardOut] = []
    ai_verdict: dict[str, Any] | None = None
    created_at: str | None = None
    updated_at: str | None = None


class SavedComparisonDetailOut(SavedComparisonOut):
    matrix: CompareMatrixData | None = None


class SharedComparisonOut(BaseModel):
    name: str
    unavailable_count: int = 0
    ai_verdict: dict[str, Any] | None = None
    matrix: CompareMatrixData | None = None


class CreateComparisonPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    product_ids: list[int] = Field(..., min_length=2, max_length=4)
    ai_verdict: dict[str, Any] | None = None


class UpdateComparisonPayload(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    product_ids: list[int] | None = Field(None, min_length=2, max_length=4)
