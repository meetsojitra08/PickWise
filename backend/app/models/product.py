from typing import Any, Dict, List, Optional
from datetime import date, datetime
from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    brand_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("brands.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True, nullable=False)
    summary: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    availability: Mapped[str] = mapped_column(String(20), default="in_stock", nullable=False)
    store_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    rating_avg: Mapped[float] = mapped_column(Numeric(3, 2), default=0.00, nullable=False)
    rating_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    value_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    search_vector = mapped_column(TSVECTOR, nullable=True)

    # Relationships
    category = relationship("Category", back_populates="products")
    brand = relationship("Brand", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.sort_order")
    specs = relationship("ProductSpec", back_populates="product", cascade="all, delete-orphan")
    price_history = relationship(
        "PriceHistory", back_populates="product", cascade="all, delete-orphan", order_by="PriceHistory.recorded_at"
    )
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")
    summary_rel = relationship("ReviewSummary", back_populates="product", uselist=False, cascade="all, delete-orphan")
    wishlist_items = relationship("WishlistItem", back_populates="product", cascade="all, delete-orphan")
    comparison_items = relationship("ComparisonItem", back_populates="product", cascade="all, delete-orphan")


class ProductImage(Base, TimestampMixin):
    __tablename__ = "product_images"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    path: Mapped[str] = mapped_column(String(500), nullable=False)
    alt_text: Mapped[str] = mapped_column(String(255), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    product = relationship("Product", back_populates="images")


class PriceHistory(Base, TimestampMixin):
    __tablename__ = "price_history"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    recorded_at: Mapped[date] = mapped_column(Date, index=True, nullable=False)

    product = relationship("Product", back_populates="price_history")
