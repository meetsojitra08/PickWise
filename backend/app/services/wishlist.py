from typing import List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.exceptions import NotFoundException
from app.core.response import PaginationLinks, PaginationMeta
from app.models import Product, User, WishlistItem
from app.schemas.wishlist import WishlistItemOut
from app.services.search import to_product_card


class WishlistService:
    @classmethod
    async def get_wishlist(
        cls,
        db: AsyncSession,
        user: User,
        page: int = 1,
        per_page: int = 48,
    ) -> Tuple[List[WishlistItemOut], int, int]:
        count_stmt = (
            select(func.count(WishlistItem.id))
            .join(Product, Product.id == WishlistItem.product_id)
            .where(
                WishlistItem.user_id == user.id,
                Product.is_published.is_(True),
                Product.deleted_at.is_(None),
            )
        )
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = (
            select(WishlistItem)
            .join(Product, Product.id == WishlistItem.product_id)
            .where(
                WishlistItem.user_id == user.id,
                Product.is_published.is_(True),
                Product.deleted_at.is_(None),
            )
            .options(
                selectinload(WishlistItem.product).selectinload(Product.category),
                selectinload(WishlistItem.product).selectinload(Product.brand),
                selectinload(WishlistItem.product).selectinload(Product.images),
            )
            .order_by(WishlistItem.created_at.desc(), WishlistItem.id.desc())
        )
        offset = (page - 1) * per_page
        rows = list((await db.execute(stmt.offset(offset).limit(per_page))).scalars().all())

        items = [
            WishlistItemOut(
                id=item.id,
                product=to_product_card(item.product) if item.product else None,
                created_at=item.created_at.isoformat() if item.created_at else None,
            )
            for item in rows
        ]
        last_page = max(1, (total + per_page - 1) // per_page)
        return items, total, last_page

    @classmethod
    async def add_item(
        cls,
        db: AsyncSession,
        user: User,
        product_id: int,
    ) -> Tuple[WishlistItemOut, bool]:
        prod_stmt = select(Product).where(Product.id == product_id, Product.is_published.is_(True), Product.deleted_at.is_(None))
        product = (await db.execute(prod_stmt)).scalar_one_or_none()
        if not product:
            raise NotFoundException(f"Product '{product_id}' not found.")

        # Check existing
        existing_stmt = (
            select(WishlistItem)
            .where(WishlistItem.user_id == user.id, WishlistItem.product_id == product_id)
            .options(
                selectinload(WishlistItem.product).selectinload(Product.category),
                selectinload(WishlistItem.product).selectinload(Product.brand),
                selectinload(WishlistItem.product).selectinload(Product.images),
            )
        )
        existing = (await db.execute(existing_stmt)).scalar_one_or_none()
        if existing:
            return (
                WishlistItemOut(
                    id=existing.id,
                    product=to_product_card(existing.product),
                    created_at=existing.created_at.isoformat() if existing.created_at else None,
                ),
                False,
            )

        item = WishlistItem(user_id=user.id, product_id=product_id)
        db.add(item)
        await db.commit()
        await db.refresh(item)

        # Reload product
        reloaded = (await db.execute(existing_stmt.where(WishlistItem.id == item.id))).scalar_one()
        return (
            WishlistItemOut(
                id=reloaded.id,
                product=to_product_card(reloaded.product),
                created_at=reloaded.created_at.isoformat() if reloaded.created_at else None,
            ),
            True,
        )

    @classmethod
    async def remove_item(cls, db: AsyncSession, user: User, product_id: int) -> None:
        stmt = select(WishlistItem).where(
            WishlistItem.user_id == user.id,
            WishlistItem.product_id == product_id,
        )
        item = (await db.execute(stmt)).scalar_one_or_none()
        if item:
            await db.delete(item)
            await db.commit()
