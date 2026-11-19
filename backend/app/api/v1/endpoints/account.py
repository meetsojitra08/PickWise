from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.exceptions import ValidationException
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import (
    UpdatePasswordRequest,
    UpdatePreferencesRequest,
    UpdateProfileRequest,
    UserOut,
)

router = APIRouter(prefix="/account")


@router.patch("/profile", status_code=status.HTTP_200_OK)
async def update_profile(
    payload: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    email_clean = payload.email.lower()
    if email_clean != user.email:
        existing = (
            await db.execute(select(User).where(User.email == email_clean, User.id != user.id))
        ).scalar_one_or_none()
        if existing:
            raise ValidationException(
                "The email has already been taken.",
                details={"email": ["The email has already been taken."]},
            )
        user.email = email_clean

    user.name = payload.name
    await db.commit()
    await db.refresh(user)

    return {"data": UserOut.from_orm(user)}


@router.put("/password", status_code=status.HTTP_200_OK)
async def update_password(
    payload: UpdatePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.current_password and not verify_password(payload.current_password, user.password):
        raise ValidationException(
            "The provided password does not match your current password.",
            details={
                "current_password": ["The provided password does not match your current password."]
            },
        )

    user.password = hash_password(payload.password)
    await db.commit()

    return {"data": {"message": "Password updated."}}


@router.put("/preferences", status_code=status.HTTP_200_OK)
async def update_preferences(
    payload: UpdatePreferencesRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_prefs = dict(user.preferences or {})
    if payload.budget_default is not None:
        current_prefs["budget_default"] = payload.budget_default
    if payload.favourite_categories is not None:
        current_prefs["favourite_categories"] = payload.favourite_categories
    if payload.priorities is not None:
        current_prefs["priorities"] = payload.priorities

    user.preferences = current_prefs
    await db.commit()
    await db.refresh(user)

    return {"data": UserOut.from_orm(user)}
