import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.core.config import settings

MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
EXEMPT_PATHS = {
    "/sanctum/csrf-cookie",
    "/api/v1/health",
    "/docs",
    "/openapi.json",
    "/redoc",
}


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-Id"] = request_id
        return response


class CsrfMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.method in MUTATING_METHODS and request.url.path not in EXEMPT_PATHS:
            # If request contains a session cookie, enforce CSRF
            session_cookie = request.cookies.get(settings.SESSION_COOKIE_NAME)
            xsrf_cookie = request.cookies.get(settings.XSRF_COOKIE_NAME)

            if session_cookie or xsrf_cookie:
                xsrf_header = request.headers.get(settings.XSRF_HEADER_NAME) or request.headers.get(
                    "x-csrf-token"
                )
                if not xsrf_header or not xsrf_cookie or xsrf_header != xsrf_cookie:
                    return JSONResponse(
                        status_code=419,
                        content={
                            "error": {
                                "code": "csrf_token_mismatch",
                                "message": "CSRF token mismatch or missing.",
                                "details": {},
                                "request_id": getattr(request.state, "request_id", None),
                            }
                        },
                    )

        response = await call_next(request)
        return response
