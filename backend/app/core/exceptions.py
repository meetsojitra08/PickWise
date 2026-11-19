from typing import Any, Dict, Optional
from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppException(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class NotFoundException(AppException):
    def __init__(self, message: str = "Resource not found", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="not_found",
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class UnauthorizedException(AppException):
    def __init__(self, message: str = "Unauthenticated", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="unauthenticated",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


class ForbiddenException(AppException):
    def __init__(self, message: str = "Forbidden", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="forbidden",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class ValidationException(AppException):
    def __init__(self, message: str = "Validation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="validation_failed",
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            details=details,
        )


class RateLimitedException(AppException):
    def __init__(self, message: str = "Too many requests", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="rate_limited",
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details=details,
        )


class AiQuotaExceededException(AppException):
    def __init__(self, message: str = "Daily AI quota exceeded", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="ai_quota_exceeded",
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details=details,
        )


class AiUnavailableException(AppException):
    def __init__(self, message: str = "AI service temporarily unavailable", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="ai_unavailable",
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details,
        )


def get_request_id(request: Request) -> Optional[str]:
    return getattr(request.state, "request_id", None) or request.headers.get("X-Request-Id")


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details or {},
                "request_id": get_request_id(request),
            }
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    details: Dict[str, list[str]] = {}
    for error in exc.errors():
        loc = error.get("loc", [])
        # Skip 'body' or 'query' prefix if present
        field = str(loc[-1]) if loc else "general"
        msg = error.get("msg", "Invalid value")
        if field not in details:
            details[field] = []
        details[field].append(msg)

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "validation_failed",
                "message": "The given data was invalid.",
                "details": details,
                "request_id": get_request_id(request),
            }
        },
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    code_map = {
        401: "unauthenticated",
        403: "forbidden",
        404: "not_found",
        405: "method_not_allowed",
        429: "rate_limited",
        500: "internal_server_error",
        503: "service_unavailable",
    }
    code = code_map.get(exc.status_code, "http_error")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": code,
                "message": str(exc.detail) if exc.detail else "An error occurred",
                "details": {},
                "request_id": get_request_id(request),
            }
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "internal_server_error",
                "message": "An unexpected error occurred on the server.",
                "details": {},
                "request_id": get_request_id(request),
            }
        },
    )
