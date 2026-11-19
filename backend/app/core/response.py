from typing import Any

from pydantic import BaseModel


class PaginationMeta(BaseModel):
    current_page: int
    per_page: int
    total: int
    last_page: int


class PaginationLinks(BaseModel):
    first: str | None = None
    last: str | None = None
    prev: str | None = None
    next: str | None = None


class ApiResponse[T](BaseModel):
    data: T


class PaginatedResponse[T](BaseModel):
    data: list[T]
    meta: PaginationMeta
    links: PaginationLinks | None = None


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None
    request_id: str | None = None


class ErrorEnvelope(BaseModel):
    error: ErrorDetail


class MoneyAmount(BaseModel):
    amount: str
    currency: str = "INR"
