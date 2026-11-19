from typing import Any

from pydantic import BaseModel, Field

EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    preferences: dict[str, Any] | None = None
    is_active: bool
    email_verified_at: str | None = None
    created_at: str | None = None

    @classmethod
    def from_orm(cls, user: Any) -> "UserOut":
        return cls(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            preferences=user.preferences,
            is_active=user.is_active,
            email_verified_at=user.email_verified_at.isoformat()
            if user.email_verified_at
            else None,
            created_at=user.created_at.isoformat() if user.created_at else None,
        )


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., pattern=EMAIL_REGEX)
    password: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX)
    password: str
    remember: bool = False


class UpdateProfileRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., pattern=EMAIL_REGEX)


class UpdatePasswordRequest(BaseModel):
    current_password: str | None = None
    password: str = Field(..., min_length=8)


class UpdatePreferencesRequest(BaseModel):
    budget_default: float | None = None
    favourite_categories: list[str] | None = Field(default_factory=list)
    priorities: list[str] | None = Field(default_factory=list)
