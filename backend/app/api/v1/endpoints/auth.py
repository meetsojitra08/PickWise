from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    create_user_session,
    destroy_user_session,
    get_current_user,
)
from app.core.config import settings
from app.core.exceptions import (
    UnauthorizedException,
    ValidationException,
)
from app.core.security import hash_password, verify_password
from app.db.session import get_db, get_redis_client
from app.models.user import User
from app.schemas.user import LoginRequest, RegisterRequest, UserOut

router = APIRouter(prefix="/auth")


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    existing = (
        await db.execute(select(User).where(User.email == payload.email.lower()))
    ).scalar_one_or_none()
    if existing:
        raise ValidationException(
            "The email has already been taken.",
            details={"email": ["The email has already been taken."]},
        )

    user = User(
        name=payload.name,
        email=payload.email.lower(),
        password=hash_password(payload.password),
        role="customer",
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    redis = get_redis_client()
    await create_user_session(user.id, response, redis)

    return {"data": UserOut.from_orm(user)}


@router.post("/login", status_code=status.HTTP_200_OK)
async def login(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    user = (
        await db.execute(select(User).where(User.email == payload.email.lower()))
    ).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password):
        raise ValidationException(
            "These credentials do not match our records.",
            details={"email": ["These credentials do not match our records."]},
        )

    if not user.is_active:
        raise UnauthorizedException("Your account has been deactivated.")

    redis = get_redis_client()
    await create_user_session(user.id, response, redis, remember=payload.remember)

    return {"data": UserOut.from_orm(user)}


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
):
    session_id = request.cookies.get(settings.SESSION_COOKIE_NAME)
    redis = get_redis_client()
    await destroy_user_session(session_id, response, redis)

    return {"data": {"message": "Logged out."}}


@router.get("/me", status_code=status.HTTP_200_OK)
async def me(
    user: User = Depends(get_current_user),
):
    return {"data": UserOut.from_orm(user)}
