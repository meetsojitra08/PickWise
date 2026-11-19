from pydantic import BaseModel

from app.schemas.catalog import ProductCardOut


class WishlistItemOut(BaseModel):
    id: int
    product: ProductCardOut | None = None
    created_at: str | None = None


class WishlistStorePayload(BaseModel):
    product_id: int
