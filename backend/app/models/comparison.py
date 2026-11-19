from typing import Any

from sqlalchemy import BigInteger, ForeignKey, SmallInteger, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Comparison(Base, TimestampMixin):
    __tablename__ = "comparisons"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    ai_verdict: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    share_token: Mapped[str | None] = mapped_column(String(32), unique=True, nullable=True)

    user = relationship("User", back_populates="comparisons")
    items = relationship(
        "ComparisonItem",
        back_populates="comparison",
        cascade="all, delete-orphan",
        order_by="ComparisonItem.position",
    )


class ComparisonItem(Base):
    __tablename__ = "comparison_items"
    __table_args__ = (
        UniqueConstraint("comparison_id", "product_id", name="uq_comparison_items_comp_prod"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    comparison_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("comparisons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    position: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)

    comparison = relationship("Comparison", back_populates="items")
    product = relationship("Product", back_populates="comparison_items")
