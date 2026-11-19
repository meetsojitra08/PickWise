import secrets
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ForbiddenException, NotFoundException, ValidationException
from app.models import (
    Comparison,
    ComparisonItem,
    Product,
    ProductSpec,
    SpecDefinition,
    User,
)
from app.schemas.compare import (
    CompareCategory,
    CompareMatrixData,
    CompareRow,
    CompareRowValue,
    SavedComparisonDetailOut,
    SavedComparisonOut,
    SharedComparisonOut,
)
from app.services.search import to_product_card


class CompareService:
    @classmethod
    async def build_compare_matrix(
        cls,
        db: AsyncSession,
        product_ids: list[int],
    ) -> CompareMatrixData:
        if len(product_ids) < 2 or len(product_ids) > 4:
            raise ValidationException("Comparisons must contain between 2 and 4 products.")

        # Fetch products
        stmt = (
            select(Product)
            .where(
                Product.id.in_(product_ids),
                Product.is_published.is_(True),
                Product.deleted_at.is_(None),
            )
            .options(
                selectinload(Product.category),
                selectinload(Product.brand),
                selectinload(Product.images),
                selectinload(Product.specs).selectinload(ProductSpec.spec_definition),
            )
        )
        found_prods = list((await db.execute(stmt)).scalars().all())

        if len(found_prods) != len(product_ids):
            raise NotFoundException("One or more compared products could not be found.")

        # Order products according to requested product_ids
        prod_map = {p.id: p for p in found_prods}
        ordered_prods = [prod_map[pid] for pid in product_ids]

        # Verify same category
        category = ordered_prods[0].category
        if not category:
            raise ValidationException("Product category missing.")

        for p in ordered_prods[1:]:
            if p.category_id != category.id:
                raise ValidationException(
                    "All products in a comparison must belong to the same category."
                )

        # Load comparable spec definitions
        spec_defs_stmt = (
            select(SpecDefinition)
            .where(
                SpecDefinition.category_id == category.id,
                SpecDefinition.is_comparable.is_(True),
            )
            .order_by(SpecDefinition.sort_order, SpecDefinition.label)
        )
        spec_defs = list((await db.execute(spec_defs_stmt)).scalars().all())

        # Map specs by product and spec_definition_id
        specs_by_prod: dict[int, dict[int, ProductSpec]] = {}
        for p in ordered_prods:
            specs_by_prod[p.id] = {s.spec_definition_id: s for s in p.specs}

        rows: list[CompareRow] = []

        for defn in spec_defs:
            row_values: list[CompareRowValue] = []
            has_value = False

            for p in ordered_prods:
                spec = specs_by_prod[p.id].get(defn.id)
                val: str | int | float | bool | None = None
                if spec:
                    if defn.data_type == "boolean":
                        val = spec.value_bool
                    elif defn.data_type == "number":
                        if spec.value_number is not None:
                            f = float(spec.value_number)
                            val = int(f) if f.is_integer() else round(f, 4)
                    else:
                        val = spec.value_text

                if val is not None:
                    has_value = True

                row_values.append(CompareRowValue(product_id=p.id, value=val))

            if not has_value:
                continue

            # Determine winner
            winner_id: int | None = None
            if defn.higher_is_better is not None and defn.data_type in ("number", "boolean"):
                best_val = None
                best_ids: list[int] = []

                for rv in row_values:
                    v = rv.value
                    if v is None:
                        continue

                    numeric_comp = float(v) if defn.data_type == "number" else (1.0 if v else 0.0)

                    if best_val is None:
                        best_val = numeric_comp
                        best_ids = [rv.product_id]
                    else:
                        if numeric_comp == best_val:
                            best_ids.append(rv.product_id)
                        elif (
                            defn.higher_is_better
                            and numeric_comp > best_val
                            or not defn.higher_is_better
                            and numeric_comp < best_val
                        ):
                            best_val = numeric_comp
                            best_ids = [rv.product_id]

                if len(best_ids) == 1:
                    winner_id = best_ids[0]

            rows.append(
                CompareRow(
                    key=defn.key,
                    label=defn.label,
                    unit=defn.unit,
                    data_type=defn.data_type,
                    higher_is_better=defn.higher_is_better,
                    winner_product_id=winner_id,
                    values=row_values,
                )
            )

        cat_dto = CompareCategory(id=category.id, name=category.name, slug=category.slug)
        cards = [to_product_card(p) for p in ordered_prods]

        return CompareMatrixData(category=cat_dto, products=cards, rows=rows)

    @classmethod
    async def list_user_comparisons(
        cls,
        db: AsyncSession,
        user: User,
        page: int = 1,
        per_page: int = 12,
    ) -> tuple[list[SavedComparisonOut], int, int]:
        count_stmt = select(func.count(Comparison.id)).where(Comparison.user_id == user.id)
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = (
            select(Comparison)
            .where(Comparison.user_id == user.id)
            .options(
                selectinload(Comparison.items)
                .selectinload(ComparisonItem.product)
                .selectinload(Product.category),
                selectinload(Comparison.items)
                .selectinload(ComparisonItem.product)
                .selectinload(Product.brand),
                selectinload(Comparison.items)
                .selectinload(ComparisonItem.product)
                .selectinload(Product.images),
            )
            .order_by(Comparison.created_at.desc(), Comparison.id.desc())
        )
        offset = (page - 1) * per_page
        comparisons = list((await db.execute(stmt.offset(offset).limit(per_page))).scalars().all())

        results: list[SavedComparisonOut] = []
        for c in comparisons:
            sorted_items = sorted(c.items, key=lambda x: x.position)
            available_cards = [
                to_product_card(i.product)
                for i in sorted_items
                if i.product and i.product.is_published and not i.product.deleted_at
            ]
            saved_count = len(sorted_items)
            unavailable = max(0, saved_count - len(available_cards))

            results.append(
                SavedComparisonOut(
                    id=c.id,
                    name=c.name,
                    share_token=c.share_token,
                    is_shared=bool(c.share_token),
                    item_count=len(available_cards),
                    unavailable_count=unavailable,
                    items=available_cards,
                    ai_verdict=c.ai_verdict,
                    created_at=c.created_at.isoformat() if c.created_at else None,
                    updated_at=c.updated_at.isoformat() if c.updated_at else None,
                )
            )

        last_page = max(1, (total + per_page - 1) // per_page)
        return results, total, last_page

    @classmethod
    async def create_comparison(
        cls,
        db: AsyncSession,
        user: User,
        name: str,
        product_ids: list[int],
        ai_verdict: dict[str, Any] | None = None,
    ) -> SavedComparisonDetailOut:
        if len(product_ids) < 2 or len(product_ids) > 4:
            raise ValidationException("Comparisons must contain between 2 and 4 products.")

        # Check products exist
        check_stmt = select(Product.id).where(
            Product.id.in_(product_ids),
            Product.is_published.is_(True),
            Product.deleted_at.is_(None),
        )
        found_ids = set((await db.execute(check_stmt)).scalars().all())
        if len(found_ids) != len(product_ids):
            raise NotFoundException("One or more compared products could not be found.")

        comp = Comparison(
            user_id=user.id,
            name=name,
            ai_verdict=ai_verdict,
        )
        db.add(comp)
        await db.flush()

        for idx, pid in enumerate(product_ids):
            item = ComparisonItem(
                comparison_id=comp.id,
                product_id=pid,
                position=idx,
            )
            db.add(item)

        await db.commit()
        await db.refresh(comp)

        return await cls.get_comparison_detail(db, comp.id, user)

    @classmethod
    async def get_comparison_detail(
        cls,
        db: AsyncSession,
        comparison_id: int,
        user: User | None = None,
    ) -> SavedComparisonDetailOut:
        stmt = (
            select(Comparison)
            .where(Comparison.id == comparison_id)
            .options(
                selectinload(Comparison.items)
                .selectinload(ComparisonItem.product)
                .selectinload(Product.category),
                selectinload(Comparison.items)
                .selectinload(ComparisonItem.product)
                .selectinload(Product.brand),
                selectinload(Comparison.items)
                .selectinload(ComparisonItem.product)
                .selectinload(Product.images),
            )
        )
        comp = (await db.execute(stmt)).scalar_one_or_none()
        if not comp:
            raise NotFoundException(f"Comparison '{comparison_id}' not found.")

        if user and comp.user_id != user.id and user.role != "admin":
            raise ForbiddenException("You cannot view this comparison.")

        sorted_items = sorted(comp.items, key=lambda x: x.position)
        available_prods = [
            i.product
            for i in sorted_items
            if i.product and i.product.is_published and not i.product.deleted_at
        ]
        available_cards = [to_product_card(p) for p in available_prods]
        saved_count = len(sorted_items)
        unavailable = max(0, saved_count - len(available_cards))

        # Build live matrix if at least 2 available products from same category
        matrix_data = None
        if len(available_prods) >= 2:
            try:
                matrix_data = await cls.build_compare_matrix(db, [p.id for p in available_prods])
            except Exception:
                matrix_data = None

        return SavedComparisonDetailOut(
            id=comp.id,
            name=comp.name,
            share_token=comp.share_token,
            is_shared=bool(comp.share_token),
            item_count=len(available_cards),
            unavailable_count=unavailable,
            items=available_cards,
            ai_verdict=comp.ai_verdict,
            matrix=matrix_data,
            created_at=comp.created_at.isoformat() if comp.created_at else None,
            updated_at=comp.updated_at.isoformat() if comp.updated_at else None,
        )

    @classmethod
    async def update_comparison(
        cls,
        db: AsyncSession,
        comparison_id: int,
        user: User,
        name: str | None = None,
        product_ids: list[int] | None = None,
    ) -> SavedComparisonDetailOut:
        stmt = (
            select(Comparison)
            .where(Comparison.id == comparison_id)
            .options(selectinload(Comparison.items))
        )
        comp = (await db.execute(stmt)).scalar_one_or_none()
        if not comp:
            raise NotFoundException(f"Comparison '{comparison_id}' not found.")

        if comp.user_id != user.id and user.role != "admin":
            raise ForbiddenException("You cannot edit this comparison.")

        if name is not None:
            comp.name = name

        if product_ids is not None:
            if len(product_ids) < 2 or len(product_ids) > 4:
                raise ValidationException("Comparisons must contain between 2 and 4 products.")

            # Check products exist
            check_stmt = select(Product.id).where(
                Product.id.in_(product_ids),
                Product.is_published.is_(True),
                Product.deleted_at.is_(None),
            )
            found_ids = set((await db.execute(check_stmt)).scalars().all())
            if len(found_ids) != len(product_ids):
                raise NotFoundException("One or more compared products could not be found.")

            # Remove old items
            for item in comp.items:
                await db.delete(item)
            await db.flush()

            # Add new items
            for idx, pid in enumerate(product_ids):
                new_item = ComparisonItem(
                    comparison_id=comp.id,
                    product_id=pid,
                    position=idx,
                )
                db.add(new_item)

        await db.commit()
        return await cls.get_comparison_detail(db, comp.id, user)

    @classmethod
    async def delete_comparison(cls, db: AsyncSession, comparison_id: int, user: User) -> None:
        stmt = select(Comparison).where(Comparison.id == comparison_id)
        comp = (await db.execute(stmt)).scalar_one_or_none()
        if not comp:
            raise NotFoundException(f"Comparison '{comparison_id}' not found.")

        if comp.user_id != user.id and user.role != "admin":
            raise ForbiddenException("You cannot delete this comparison.")

        await db.delete(comp)
        await db.commit()

    @classmethod
    async def share_comparison(cls, db: AsyncSession, comparison_id: int, user: User) -> str:
        stmt = select(Comparison).where(Comparison.id == comparison_id)
        comp = (await db.execute(stmt)).scalar_one_or_none()
        if not comp:
            raise NotFoundException(f"Comparison '{comparison_id}' not found.")

        if comp.user_id != user.id and user.role != "admin":
            raise ForbiddenException("You cannot share this comparison.")

        if not comp.share_token:
            comp.share_token = secrets.token_hex(16)
            await db.commit()
            await db.refresh(comp)

        return comp.share_token

    @classmethod
    async def stop_sharing_comparison(
        cls, db: AsyncSession, comparison_id: int, user: User
    ) -> None:
        stmt = select(Comparison).where(Comparison.id == comparison_id)
        comp = (await db.execute(stmt)).scalar_one_or_none()
        if not comp:
            raise NotFoundException(f"Comparison '{comparison_id}' not found.")

        if comp.user_id != user.id and user.role != "admin":
            raise ForbiddenException("You cannot unshare this comparison.")

        comp.share_token = None
        await db.commit()

    @classmethod
    async def get_shared_comparison(cls, db: AsyncSession, token: str) -> SharedComparisonOut:
        stmt = (
            select(Comparison)
            .where(Comparison.share_token == token)
            .options(
                selectinload(Comparison.items)
                .selectinload(ComparisonItem.product)
                .selectinload(Product.category),
                selectinload(Comparison.items)
                .selectinload(ComparisonItem.product)
                .selectinload(Product.brand),
                selectinload(Comparison.items)
                .selectinload(ComparisonItem.product)
                .selectinload(Product.images),
            )
        )
        comp = (await db.execute(stmt)).scalar_one_or_none()
        if not comp:
            raise NotFoundException("Shared comparison not found.")

        sorted_items = sorted(comp.items, key=lambda x: x.position)
        available_prods = [
            i.product
            for i in sorted_items
            if i.product and i.product.is_published and not i.product.deleted_at
        ]
        saved_count = len(sorted_items)
        unavailable = max(0, saved_count - len(available_prods))

        matrix_data = None
        if len(available_prods) >= 2:
            try:
                matrix_data = await cls.build_compare_matrix(db, [p.id for p in available_prods])
            except Exception:
                matrix_data = None

        return SharedComparisonOut(
            name=comp.name,
            unavailable_count=unavailable,
            ai_verdict=comp.ai_verdict,
            matrix=matrix_data,
        )
