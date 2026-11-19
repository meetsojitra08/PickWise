from typing import Any, Dict, Optional
from datetime import datetime
from sqlalchemy import BigInteger, Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="customer", index=True, nullable=False)
    preferences: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    email_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    remember_token: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Relationships
    reviews = relationship("Review", back_populates="user", foreign_keys="[Review.user_id]", cascade="all, delete-orphan")
    wishlist_items = relationship("WishlistItem", back_populates="user", cascade="all, delete-orphan")
    comparisons = relationship("Comparison", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("AiConversation", back_populates="user", cascade="all, delete-orphan")
