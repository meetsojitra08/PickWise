from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field
from app.schemas.catalog import ProductCardOut


class CompareCategory(BaseModel):
    id: int
    name: str
    slug: str


class CompareRowValue(BaseModel):
    product_id: int
    value: Optional[Union[str, int, float, bool]] = None


class CompareRow(BaseModel):
    key: str
    label: str
    unit: Optional[str] = None
    data_type: str
    higher_is_better: Optional[bool] = None
    winner_product_id: Optional[int] = None
    values: List[CompareRowValue] = []


class CompareMatrixData(BaseModel):
    category: CompareCategory
    products: List[ProductCardOut] = []
    rows: List[CompareRow] = []


class CompareRequestPayload(BaseModel):
    product_ids: List[int] = Field(..., min_length=2, max_length=4)


class SavedComparisonOut(BaseModel):
    id: int
    name: str
    share_token: Optional[str] = None
    is_shared: bool = False
    item_count: int
    unavailable_count: int = 0
    items: List[ProductCardOut] = []
    ai_verdict: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class SavedComparisonDetailOut(SavedComparisonOut):
    matrix: Optional[CompareMatrixData] = None


class SharedComparisonOut(BaseModel):
    name: str
    unavailable_count: int = 0
    ai_verdict: Optional[Dict[str, Any]] = None
    matrix: Optional[CompareMatrixData] = None


class CreateComparisonPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    product_ids: List[int] = Field(..., min_length=2, max_length=4)
    ai_verdict: Optional[Dict[str, Any]] = None


class UpdateComparisonPayload(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    product_ids: Optional[List[int]] = Field(None, min_length=2, max_length=4)
