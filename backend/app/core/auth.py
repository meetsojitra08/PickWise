from fastapi import Depends, Request, Response
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import generate_csrf_token, generate_secure_token
from app.db.session import get_db, get_redis_client
from app.models.user import User

SESSION_PREFIX = "session:"


async def create_user_session(
    user_id: int, response: Response, redis: Redis, remember: bool = False
) -> str:
    session_id = generate_secure_token(32)
    ttl_seconds = (30 * 24 * 3600) if remember else (settings.SESSION_LIFETIME_MINUTES * 60)

    await redis.set(f"{SESSION_PREFIX}{session_id}", str(user_id), ex=ttl_seconds)

    is_secure = (
        settings.SESSION_COOKIE_SECURE
        if settings.SESSION_COOKIE_SECURE is not None
        else (settings.APP_ENV != "local" or settings.SESSION_COOKIE_SAMESITE == "none")
    )

    # Set Session Cookie
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_id,
        path="/",
        httponly=True,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        secure=is_secure,
        max_age=ttl_seconds,
    )

    # Set XSRF-TOKEN cookie for CSRF double-submit
    csrf_token = generate_csrf_token()
    response.set_cookie(
        key=settings.XSRF_COOKIE_NAME,
        value=csrf_token,
        path="/",
        httponly=False,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        secure=is_secure,
        max_age=ttl_seconds,
    )

    return session_id


async def destroy_user_session(session_id: str | None, response: Response, redis: Redis) -> None:
    if session_id:
        await redis.delete(f"{SESSION_PREFIX}{session_id}")

    is_secure = (
        settings.SESSION_COOKIE_SECURE
        if settings.SESSION_COOKIE_SECURE is not None
        else (settings.APP_ENV != "local" or settings.SESSION_COOKIE_SAMESITE == "none")
    )

    response.delete_cookie(
        settings.SESSION_COOKIE_NAME,
        path="/",
        samesite=settings.SESSION_COOKIE_SAMESITE,
        secure=is_secure,
    )
    response.delete_cookie(
        settings.XSRF_COOKIE_NAME,
        path="/",
        samesite=settings.SESSION_COOKIE_SAMESITE,
        secure=is_secure,
    )


async def get_optional_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User | None:
    session_id = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not session_id:
        return None

    redis = get_redis_client()
    user_id_str = await redis.get(f"{SESSION_PREFIX}{session_id}")
    if not user_id_str:
        return None

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        return None

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        return None

    # Sliding session renewal
    await redis.expire(f"{SESSION_PREFIX}{session_id}", settings.SESSION_LIFETIME_MINUTES * 60)
    return user


async def get_current_user(
    user: User | None = Depends(get_optional_user),
) -> User:
    if not user:
        raise UnauthorizedException("Unauthenticated.")
    if not user.is_active:
        raise ForbiddenException("Your account has been deactivated.")
    return user


async def require_admin(
    user: User = Depends(get_current_user),
) -> User:
    if user.role != "admin":
        raise ForbiddenException("This action is unauthorized.")
    return user
