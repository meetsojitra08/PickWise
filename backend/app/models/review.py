from typing import Any, Dict, List, Optional
from datetime import datetime
from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class Review(Base, TimestampMixin):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    author_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True, nullable=False)
    moderated_by: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    moderated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    product = relationship("Product", back_populates="reviews")
    user = relationship("User", back_populates="reviews", foreign_keys="[Review.user_id]")


class ReviewSummary(Base):
    __tablename__ = "review_summaries"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("products.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    pros: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    cons: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    sentiment: Mapped[str] = mapped_column(String(20), default="positive", nullable=False)
    reviews_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    product = relationship("Product", back_populates="summary_rel")
