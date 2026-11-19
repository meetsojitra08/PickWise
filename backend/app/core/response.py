from typing import Any, Dict, Generic, List, Optional, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class PaginationMeta(BaseModel):
    current_page: int
    per_page: int
    total: int
    last_page: int


class PaginationLinks(BaseModel):
    first: Optional[str] = None
    last: Optional[str] = None
    prev: Optional[str] = None
    next: Optional[str] = None


class ApiResponse(BaseModel, Generic[T]):
    data: T


class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    meta: PaginationMeta
    links: Optional[PaginationLinks] = None


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    request_id: Optional[str] = None


class ErrorEnvelope(BaseModel):
    error: ErrorDetail


class MoneyAmount(BaseModel):
    amount: str
    currency: str = "INR"
