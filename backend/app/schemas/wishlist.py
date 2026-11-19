from typing import Optional
from pydantic import BaseModel
from app.schemas.catalog import ProductCardOut


class WishlistItemOut(BaseModel):
    id: int
    product: Optional[ProductCardOut] = None
    created_at: Optional[str] = None


class WishlistStorePayload(BaseModel):
    product_id: int
