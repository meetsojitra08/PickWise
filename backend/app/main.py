from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    generic_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from app.core.middleware import CsrfMiddleware, RequestIdMiddleware
from app.core.security import generate_csrf_token
from app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Cleanup database engine connections on shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Custom Middlewares
app.add_middleware(CsrfMiddleware)
app.add_middleware(RequestIdMiddleware)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-Id"],
)

# Exception Handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)


# Laravel Sanctum CSRF compatibility route
@app.get("/sanctum/csrf-cookie")
@app.head("/sanctum/csrf-cookie")
async def sanctum_csrf_cookie(response: Response):
    token = generate_csrf_token()
    response.status_code = 204
    response.set_cookie(
        key=settings.XSRF_COOKIE_NAME,
        value=token,
        path="/",
        httponly=False,  # JavaScript in browser reads this to send X-XSRF-TOKEN header
        samesite="lax",
        secure=settings.APP_ENV != "local",
    )
    return response


# Framework health route
@app.get("/up", status_code=200)
async def up_check():
    return {"status": "ok"}


# Mount API V1 routes
app.include_router(api_v1_router, prefix="/api/v1")
