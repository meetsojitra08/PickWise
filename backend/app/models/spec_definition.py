from sqlalchemy import BigInteger, Boolean, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class SpecDefinition(Base, TimestampMixin):
    __tablename__ = "spec_definitions"
    __table_args__ = (
        UniqueConstraint("category_id", "key", name="uq_spec_definitions_category_key"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True
    )
    key: Mapped[str] = mapped_column(String(60), index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    unit: Mapped[str | None] = mapped_column(String(30), nullable=True)
    data_type: Mapped[str] = mapped_column(
        String(20), default="text", nullable=False
    )  # 'text', 'number', 'boolean'
    is_filterable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_comparable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    higher_is_better: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    category = relationship("Category", back_populates="spec_definitions")
    product_specs = relationship(
        "ProductSpec", back_populates="spec_definition", cascade="all, delete-orphan"
    )


class ProductSpec(Base, TimestampMixin):
    __tablename__ = "product_specs"
    __table_args__ = (
        UniqueConstraint(
            "product_id", "spec_definition_id", name="uq_product_specs_product_definition"
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    spec_definition_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("spec_definitions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    value_text: Mapped[str | None] = mapped_column(String(500), nullable=True)
    value_number: Mapped[float | None] = mapped_column(Numeric(14, 4), nullable=True)
    value_bool: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    product = relationship("Product", back_populates="specs")
    spec_definition = relationship("SpecDefinition", back_populates="product_specs")
