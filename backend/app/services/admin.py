import re
from datetime import UTC, date, datetime, time, timedelta
from typing import Any

from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundException
from app.models import (
    AdminActivityLog,
    AiUsageLog,
    Brand,
    Category,
    PriceHistory,
    Product,
    ProductImage,
    ProductSpec,
    Review,
    ReviewSummary,
    SpecDefinition,
    User,
)
from app.schemas.admin import (
    AdminActivityItem,
    AdminAiFeatureBreakdown,
    AdminAiUsageData,
    AdminAiUsageDetailedSummary,
    AdminAiUsageLogItem,
    AdminAiUsagePagination,
    AdminAiUsageSummary,
    AdminBrand,
    AdminBrandFormData,
    AdminCategory,
    AdminCategoryFormData,
    AdminDashboardCounts,
    AdminDashboardData,
    AdminPendingReviewItem,
    AdminProduct,
    AdminProductFormData,
    AdminProductImage,
    AdminProductSpec,
    AdminReview,
    AdminSpecDefinition,
    AdminSpecDefinitionFormData,
    AdminUser,
)
from app.schemas.catalog import format_media_url
from app.services.reviews import ReviewService
from app.services.search import format_availability_label
from app.services.value_score import ValueScoreCalculator


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[-\s]+", "-", text)


class AdminService:
    @classmethod
    async def log_activity(
        cls,
        db: AsyncSession,
        admin_id: int,
        action: str,
        subject_type: str | None = None,
        subject_id: int | None = None,
        changes: dict[str, Any] | None = None,
        ip_address: str | None = None,
    ) -> None:
        log = AdminActivityLog(
            admin_id=admin_id,
            action=action,
            subject_type=subject_type,
            subject_id=subject_id,
            changes=changes,
            ip_address=ip_address,
            created_at=datetime.now(UTC).replace(tzinfo=None),
        )
        db.add(log)
        await db.flush()

    @classmethod
    async def get_dashboard(cls, db: AsyncSession) -> AdminDashboardData:
        # Product counts
        total_p = (
            await db.execute(select(func.count(Product.id)).where(Product.deleted_at.is_(None)))
        ).scalar() or 0
        pub_p = (
            await db.execute(
                select(func.count(Product.id)).where(
                    Product.deleted_at.is_(None), Product.is_published.is_(True)
                )
            )
        ).scalar() or 0
        unpub_p = total_p - pub_p

        # User counts
        total_u = (await db.execute(select(func.count(User.id)))).scalar() or 0
        act_u = (
            await db.execute(select(func.count(User.id)).where(User.is_active.is_(True)))
        ).scalar() or 0
        cust_u = (
            await db.execute(select(func.count(User.id)).where(User.role == "customer"))
        ).scalar() or 0
        admin_u = (
            await db.execute(select(func.count(User.id)).where(User.role == "admin"))
        ).scalar() or 0

        # Pending reviews
        pend_r = (
            await db.execute(select(func.count(Review.id)).where(Review.status == "pending"))
        ).scalar() or 0

        # AI calls today
        today_start = datetime.combine(datetime.now(UTC).date(), time.min)
        ai_today_stmt = select(
            func.count(AiUsageLog.id).label("total"),
            func.coalesce(func.sum(case((AiUsageLog.status == "ok", 1), else_=0)), 0).label(
                "success"
            ),
            func.coalesce(func.sum(case((AiUsageLog.status != "ok", 1), else_=0)), 0).label(
                "failed"
            ),
            func.coalesce(
                func.sum(AiUsageLog.prompt_tokens + AiUsageLog.completion_tokens), 0
            ).label("tokens"),
            func.coalesce(func.avg(AiUsageLog.latency_ms), 0).label("avg_lat"),
        ).where(AiUsageLog.created_at >= today_start)
        ai_row = (await db.execute(ai_today_stmt)).one()

        # Recent activity
        act_stmt = (
            select(AdminActivityLog)
            .options(selectinload(AdminActivityLog.admin))
            .order_by(AdminActivityLog.created_at.desc())
            .limit(10)
        )
        acts = list((await db.execute(act_stmt)).scalars().all())
        recent_activity = [
            AdminActivityItem(
                id=a.id,
                admin={"id": a.admin.id, "name": a.admin.name, "email": a.admin.email}
                if a.admin
                else None,
                action=a.action,
                subject_type=a.subject_type,
                subject_id=a.subject_id,
                changes=a.changes,
                ip_address=a.ip_address,
                created_at=a.created_at.isoformat(),
            )
            for a in acts
        ]

        # Recent pending reviews
        rev_stmt = (
            select(Review)
            .where(Review.status == "pending")
            .options(selectinload(Review.product), selectinload(Review.user))
            .order_by(Review.created_at.desc())
            .limit(5)
        )
        pending_reviews_rows = list((await db.execute(rev_stmt)).scalars().all())
        pending_reviews = [
            AdminPendingReviewItem(
                id=r.id,
                product={"id": r.product.id, "name": r.product.name, "slug": r.product.slug}
                if r.product
                else None,
                author_name=r.user.name if r.user else (r.author_name or "Customer"),
                rating=r.rating,
                title=r.title,
                body=r.body,
                created_at=r.created_at.isoformat() if r.created_at else "",
            )
            for r in pending_reviews_rows
        ]

        return AdminDashboardData(
            counts=AdminDashboardCounts(
                products={"total": total_p, "published": pub_p, "unpublished": unpub_p},
                users={"total": total_u, "active": act_u, "customers": cust_u, "admins": admin_u},
                pending_reviews=pend_r,
                ai_calls_today=int(ai_row.total or 0),
            ),
            ai_usage_today=AdminAiUsageSummary(
                total_calls=int(ai_row.total or 0),
                successful_calls=int(ai_row.success or 0),
                failed_calls=int(ai_row.failed or 0),
                total_tokens=int(ai_row.tokens or 0),
                avg_latency_ms=round(float(ai_row.avg_lat or 0), 1),
            ),
            recent_activity=recent_activity,
            pending_reviews=pending_reviews,
        )

    # ---------------- Category CRUD ----------------
    @classmethod
    async def list_categories(
        cls,
        db: AsyncSession,
        search: str | None = None,
        is_active: bool | None = None,
        parent_id: str | None = None,
        page: int = 1,
        per_page: int = 50,
    ) -> tuple[list[AdminCategory], int, int]:
        stmt = select(Category).options(selectinload(Category.parent))
        if search:
            stmt = stmt.where(Category.name.ilike(f"%{search}%"))
        if is_active is not None:
            stmt = stmt.where(Category.is_active.is_(is_active))
        if parent_id is not None:
            if parent_id == "null":
                stmt = stmt.where(Category.parent_id.is_(None))
            else:
                stmt = stmt.where(Category.parent_id == int(parent_id))

        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(Category.sort_order, Category.name)
        offset = (page - 1) * per_page
        categories = list((await db.execute(stmt.offset(offset).limit(per_page))).scalars().all())

        # Product & Spec & Children counts
        cat_ids = [c.id for c in categories]
        prod_counts: dict[int, int] = {}
        spec_counts: dict[int, int] = {}
        child_counts: dict[int, int] = {}

        if cat_ids:
            pc_stmt = (
                select(Product.category_id, func.count(Product.id))
                .where(Product.category_id.in_(cat_ids), Product.deleted_at.is_(None))
                .group_by(Product.category_id)
            )
            for cid, cnt in (await db.execute(pc_stmt)).all():
                prod_counts[cid] = cnt

            sc_stmt = (
                select(SpecDefinition.category_id, func.count(SpecDefinition.id))
                .where(SpecDefinition.category_id.in_(cat_ids))
                .group_by(SpecDefinition.category_id)
            )
            for cid, cnt in (await db.execute(sc_stmt)).all():
                spec_counts[cid] = cnt

            cc_stmt = (
                select(Category.parent_id, func.count(Category.id))
                .where(Category.parent_id.in_(cat_ids))
                .group_by(Category.parent_id)
            )
            for pid, cnt in (await db.execute(cc_stmt)).all():
                child_counts[pid] = cnt

        result = [
            AdminCategory(
                id=c.id,
                parent_id=c.parent_id,
                parent={"id": c.parent.id, "name": c.parent.name, "slug": c.parent.slug}
                if c.parent
                else None,
                name=c.name,
                slug=c.slug,
                description=c.description,
                image_path=c.image_path,
                image_url=format_media_url(c.image_path),
                sort_order=c.sort_order,
                is_active=c.is_active,
                products_count=prod_counts.get(c.id, 0),
                spec_definitions_count=spec_counts.get(c.id, 0),
                children_count=child_counts.get(c.id, 0),
                created_at=c.created_at.isoformat() if c.created_at else None,
                updated_at=c.updated_at.isoformat() if c.updated_at else None,
            )
            for c in categories
        ]
        last_page = max(1, (total + per_page - 1) // per_page)
        return result, total, last_page

    @classmethod
    async def create_category(
        cls, db: AsyncSession, admin: User, data: AdminCategoryFormData
    ) -> AdminCategory:
        slug = data.slug or slugify(data.name)
        cat = Category(
            name=data.name,
            slug=slug,
            parent_id=data.parent_id,
            description=data.description,
            sort_order=data.sort_order,
            is_active=data.is_active,
        )
        db.add(cat)
        await db.commit()
        await db.refresh(cat)
        await cls.log_activity(db, admin.id, "created", "category", cat.id, {"name": cat.name})
        cats, _, _ = await cls.list_categories(db, search=cat.name)
        return cats[0]

    @classmethod
    async def update_category(
        cls, db: AsyncSession, admin: User, cat_id: int, data: dict[str, Any]
    ) -> AdminCategory:
        stmt = select(Category).where(Category.id == cat_id)
        cat = (await db.execute(stmt)).scalar_one_or_none()
        if not cat:
            raise NotFoundException(f"Category '{cat_id}' not found.")

        for k, v in data.items():
            if hasattr(cat, k) and v is not None:
                setattr(cat, k, v)
        if "name" in data and "slug" not in data:
            cat.slug = slugify(data["name"])

        await db.commit()
        await cls.log_activity(db, admin.id, "updated", "category", cat.id, data)
        cats, _, _ = await cls.list_categories(db, search=cat.name)
        return cats[0]

    @classmethod
    async def delete_category(cls, db: AsyncSession, admin: User, cat_id: int) -> None:
        stmt = select(Category).where(Category.id == cat_id)
        cat = (await db.execute(stmt)).scalar_one_or_none()
        if not cat:
            raise NotFoundException(f"Category '{cat_id}' not found.")
        await cls.log_activity(db, admin.id, "deleted", "category", cat.id, {"name": cat.name})
        await db.delete(cat)
        await db.commit()

    # ---------------- Category Specs CRUD ----------------
    @classmethod
    async def list_category_specs(
        cls, db: AsyncSession, category_id: int, search: str | None = None
    ) -> list[AdminSpecDefinition]:
        stmt = select(SpecDefinition).where(SpecDefinition.category_id == category_id)
        if search:
            stmt = stmt.where(
                or_(
                    SpecDefinition.label.ilike(f"%{search}%"),
                    SpecDefinition.key.ilike(f"%{search}%"),
                )
            )
        stmt = stmt.order_by(SpecDefinition.sort_order, SpecDefinition.label)
        specs = list((await db.execute(stmt)).scalars().all())

        # Count product_specs
        spec_ids = [s.id for s in specs]
        ps_counts: dict[int, int] = {}
        if spec_ids:
            pc_stmt = (
                select(ProductSpec.spec_definition_id, func.count(ProductSpec.id))
                .where(ProductSpec.spec_definition_id.in_(spec_ids))
                .group_by(ProductSpec.spec_definition_id)
            )
            for sid, cnt in (await db.execute(pc_stmt)).all():
                ps_counts[sid] = cnt

        return [
            AdminSpecDefinition(
                id=s.id,
                category_id=s.category_id,
                key=s.key,
                label=s.label,
                unit=s.unit,
                data_type=s.data_type,
                is_filterable=s.is_filterable,
                is_comparable=s.is_comparable,
                higher_is_better=s.higher_is_better,
                sort_order=s.sort_order,
                product_specs_count=ps_counts.get(s.id, 0),
                created_at=s.created_at.isoformat() if s.created_at else None,
                updated_at=s.updated_at.isoformat() if s.updated_at else None,
            )
            for s in specs
        ]

    @classmethod
    async def create_spec(
        cls, db: AsyncSession, admin: User, category_id: int, data: AdminSpecDefinitionFormData
    ) -> AdminSpecDefinition:
        spec = SpecDefinition(
            category_id=category_id,
            key=data.key,
            label=data.label,
            unit=data.unit,
            data_type=data.data_type,
            is_filterable=data.is_filterable,
            is_comparable=data.is_comparable,
            higher_is_better=data.higher_is_better,
            sort_order=data.sort_order,
        )
        db.add(spec)
        await db.commit()
        await db.refresh(spec)
        await cls.log_activity(
            db, admin.id, "created", "spec_definition", spec.id, {"key": spec.key}
        )
        specs = await cls.list_category_specs(db, category_id, search=spec.key)
        return specs[0]

    @classmethod
    async def update_spec(
        cls, db: AsyncSession, admin: User, category_id: int, spec_id: int, data: dict[str, Any]
    ) -> AdminSpecDefinition:
        stmt = select(SpecDefinition).where(
            SpecDefinition.id == spec_id, SpecDefinition.category_id == category_id
        )
        spec = (await db.execute(stmt)).scalar_one_or_none()
        if not spec:
            raise NotFoundException(f"Spec '{spec_id}' not found.")
        for k, v in data.items():
            if hasattr(spec, k) and v is not None:
                setattr(spec, k, v)
        await db.commit()
        await cls.log_activity(db, admin.id, "updated", "spec_definition", spec.id, data)
        specs = await cls.list_category_specs(db, category_id, search=spec.key)
        return specs[0]

    @classmethod
    async def delete_spec(
        cls, db: AsyncSession, admin: User, category_id: int, spec_id: int
    ) -> None:
        stmt = select(SpecDefinition).where(
            SpecDefinition.id == spec_id, SpecDefinition.category_id == category_id
        )
        spec = (await db.execute(stmt)).scalar_one_or_none()
        if not spec:
            raise NotFoundException(f"Spec '{spec_id}' not found.")
        await cls.log_activity(
            db, admin.id, "deleted", "spec_definition", spec.id, {"key": spec.key}
        )
        await db.delete(spec)
        await db.commit()

    # ---------------- Brands CRUD ----------------
    @classmethod
    async def list_brands(
        cls,
        db: AsyncSession,
        search: str | None = None,
        sort: str | None = None,
        page: int = 1,
        per_page: int = 50,
    ) -> tuple[list[AdminBrand], int, int]:
        stmt = select(Brand)
        if search:
            stmt = stmt.where(Brand.name.ilike(f"%{search}%"))
        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(Brand.name)
        offset = (page - 1) * per_page
        brands = list((await db.execute(stmt.offset(offset).limit(per_page))).scalars().all())

        brand_ids = [b.id for b in brands]
        prod_counts: dict[int, int] = {}
        if brand_ids:
            pc_stmt = (
                select(Product.brand_id, func.count(Product.id))
                .where(Product.brand_id.in_(brand_ids), Product.deleted_at.is_(None))
                .group_by(Product.brand_id)
            )
            for bid, cnt in (await db.execute(pc_stmt)).all():
                prod_counts[bid] = cnt

        result = [
            AdminBrand(
                id=b.id,
                name=b.name,
                slug=b.slug,
                logo_path=b.logo_path,
                logo_url=format_media_url(b.logo_path),
                products_count=prod_counts.get(b.id, 0),
                created_at=b.created_at.isoformat() if b.created_at else None,
                updated_at=b.updated_at.isoformat() if b.updated_at else None,
            )
            for b in brands
        ]
        last_page = max(1, (total + per_page - 1) // per_page)
        return result, total, last_page

    @classmethod
    async def create_brand(
        cls, db: AsyncSession, admin: User, data: AdminBrandFormData
    ) -> AdminBrand:
        slug = data.slug or slugify(data.name)
        brand = Brand(name=data.name, slug=slug, logo_path=data.logo_path)
        db.add(brand)
        await db.commit()
        await db.refresh(brand)
        await cls.log_activity(db, admin.id, "created", "brand", brand.id, {"name": brand.name})
        brands, _, _ = await cls.list_brands(db, search=brand.name)
        return brands[0]

    @classmethod
    async def update_brand(
        cls, db: AsyncSession, admin: User, brand_id: int, data: dict[str, Any]
    ) -> AdminBrand:
        stmt = select(Brand).where(Brand.id == brand_id)
        brand = (await db.execute(stmt)).scalar_one_or_none()
        if not brand:
            raise NotFoundException(f"Brand '{brand_id}' not found.")
        for k, v in data.items():
            if hasattr(brand, k) and v is not None:
                setattr(brand, k, v)
        if "name" in data and "slug" not in data:
            brand.slug = slugify(data["name"])
        await db.commit()
        await cls.log_activity(db, admin.id, "updated", "brand", brand.id, data)
        brands, _, _ = await cls.list_brands(db, search=brand.name)
        return brands[0]

    @classmethod
    async def delete_brand(cls, db: AsyncSession, admin: User, brand_id: int) -> None:
        stmt = select(Brand).where(Brand.id == brand_id)
        brand = (await db.execute(stmt)).scalar_one_or_none()
        if not brand:
            raise NotFoundException(f"Brand '{brand_id}' not found.")
        await cls.log_activity(db, admin.id, "deleted", "brand", brand.id, {"name": brand.name})
        await db.delete(brand)
        await db.commit()

    # ---------------- Product CRUD ----------------
    @classmethod
    async def list_products(
        cls,
        db: AsyncSession,
        search: str | None = None,
        category_id: int | None = None,
        brand_id: int | None = None,
        is_published: bool | None = None,
        availability: str | None = None,
        trashed: str | None = None,
        sort: str | None = None,
        page: int = 1,
        per_page: int = 24,
    ) -> tuple[list[AdminProduct], int, int]:
        stmt = select(Product).options(
            selectinload(Product.category),
            selectinload(Product.brand),
            selectinload(Product.images),
            selectinload(Product.specs).selectinload(ProductSpec.spec_definition),
            selectinload(Product.price_history),
        )

        if trashed == "only":
            stmt = stmt.where(Product.deleted_at.is_not(None))
        elif trashed != "with":
            stmt = stmt.where(Product.deleted_at.is_(None))

        if search:
            stmt = stmt.where(Product.name.ilike(f"%{search}%"))
        if category_id:
            stmt = stmt.where(Product.category_id == category_id)
        if brand_id:
            stmt = stmt.where(Product.brand_id == brand_id)
        if is_published is not None:
            stmt = stmt.where(Product.is_published.is_(is_published))
        if availability:
            stmt = stmt.where(Product.availability == availability)

        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        if sort == "price_asc":
            stmt = stmt.order_by(Product.price.asc())
        elif sort == "price_desc":
            stmt = stmt.order_by(Product.price.desc())
        elif sort == "rating":
            stmt = stmt.order_by(Product.rating_avg.desc())
        else:
            stmt = stmt.order_by(Product.created_at.desc(), Product.id.desc())

        offset = (page - 1) * per_page
        products = list((await db.execute(stmt.offset(offset).limit(per_page))).scalars().all())

        items = [cls._to_admin_product(p) for p in products]
        last_page = max(1, (total + per_page - 1) // per_page)
        return items, total, last_page

    @classmethod
    def _to_admin_product(cls, p: Product) -> AdminProduct:
        primary_img = None
        for img in p.images:
            if img.is_primary:
                primary_img = {
                    "id": img.id,
                    "url": format_media_url(img.path),
                    "alt_text": img.alt_text,
                }
                break
        if not primary_img and p.images:
            primary_img = {
                "id": p.images[0].id,
                "url": format_media_url(p.images[0].path),
                "alt_text": p.images[0].alt_text,
            }

        imgs = [
            AdminProductImage(
                id=img.id,
                url=format_media_url(img.path),
                alt_text=img.alt_text,
                sort_order=img.sort_order,
                is_primary=img.is_primary,
            )
            for img in p.images
        ]

        specs = [
            AdminProductSpec(
                id=s.id,
                spec_definition_id=s.spec_definition_id,
                key=s.spec_definition.key,
                label=s.spec_definition.label,
                unit=s.spec_definition.unit,
                data_type=s.spec_definition.data_type,
                value=s.value_bool
                if s.spec_definition.data_type == "boolean"
                else (
                    float(s.value_number)
                    if s.spec_definition.data_type == "number" and s.value_number is not None
                    else s.value_text
                ),
                is_filterable=s.spec_definition.is_filterable,
                is_comparable=s.spec_definition.is_comparable,
                higher_is_better=s.spec_definition.higher_is_better,
            )
            for s in p.specs
        ]

        ph = [
            {
                "id": h.id,
                "recorded_at": h.recorded_at.isoformat(),
                "price": {
                    "amount": f"{float(h.price):.2f}",
                    "currency": p.currency,
                    "formatted": f"${float(h.price):.2f}",
                },
            }
            for h in p.price_history
        ]

        return AdminProduct(
            id=p.id,
            category_id=p.category_id,
            brand_id=p.brand_id,
            name=p.name,
            slug=p.slug,
            summary=p.summary,
            description=p.description,
            price={
                "amount": f"{float(p.price):.2f}",
                "currency": p.currency,
                "formatted": f"${float(p.price):.2f}",
            },
            currency=p.currency,
            availability=p.availability,
            availability_label=format_availability_label(p.availability),
            store_url=p.store_url,
            rating_avg=round(float(p.rating_avg), 2),
            rating_count=p.rating_count,
            value_score=p.value_score,
            is_published=p.is_published,
            is_deleted=p.deleted_at is not None,
            category={"id": p.category.id, "name": p.category.name, "slug": p.category.slug}
            if p.category
            else None,
            brand={"id": p.brand.id, "name": p.brand.name, "slug": p.brand.slug}
            if p.brand
            else None,
            primary_image=primary_img,
            images=imgs,
            specs=specs,
            price_history=ph,
            created_at=p.created_at.isoformat() if p.created_at else None,
            updated_at=p.updated_at.isoformat() if p.updated_at else None,
            deleted_at=p.deleted_at.isoformat() if p.deleted_at else None,
        )

    @classmethod
    async def get_product(cls, db: AsyncSession, product_id: int) -> AdminProduct:
        stmt = (
            select(Product)
            .where(Product.id == product_id)
            .options(
                selectinload(Product.category),
                selectinload(Product.brand),
                selectinload(Product.images),
                selectinload(Product.specs).selectinload(ProductSpec.spec_definition),
                selectinload(Product.price_history),
            )
        )
        p = (await db.execute(stmt)).scalar_one_or_none()
        if not p:
            raise NotFoundException(f"Product '{product_id}' not found.")
        return cls._to_admin_product(p)

    @classmethod
    async def create_product(
        cls, db: AsyncSession, admin: User, data: AdminProductFormData
    ) -> AdminProduct:
        slug = data.slug or slugify(data.name)
        p = Product(
            category_id=data.category_id,
            brand_id=data.brand_id,
            name=data.name,
            slug=slug,
            summary=data.summary,
            description=data.description,
            price=data.price,
            currency=data.currency or "USD",
            availability=data.availability,
            store_url=data.store_url,
            is_published=data.is_published,
        )
        db.add(p)
        await db.flush()

        # Add initial price history
        ph = PriceHistory(product_id=p.id, price=p.price, recorded_at=date.today())
        db.add(ph)

        # Add specs if passed
        if data.specs:
            for s in data.specs:
                defn_id = s.get("spec_definition_id")
                val = s.get("value")
                defn_stmt = select(SpecDefinition).where(SpecDefinition.id == defn_id)
                defn = (await db.execute(defn_stmt)).scalar_one_or_none()
                if defn:
                    ps = ProductSpec(
                        product_id=p.id,
                        spec_definition_id=defn.id,
                        value_bool=bool(val) if defn.data_type == "boolean" else None,
                        value_number=float(val)
                        if defn.data_type == "number" and val is not None
                        else None,
                        value_text=str(val)
                        if defn.data_type == "text" and val is not None
                        else None,
                    )
                    db.add(ps)

        await db.commit()
        await ValueScoreCalculator.recalculate_for_product(db, p.id)
        await cls.log_activity(db, admin.id, "created", "product", p.id, {"name": p.name})
        return await cls.get_product(db, p.id)

    @classmethod
    async def update_product(
        cls, db: AsyncSession, admin: User, product_id: int, data: dict[str, Any]
    ) -> AdminProduct:
        stmt = select(Product).where(Product.id == product_id)
        p = (await db.execute(stmt)).scalar_one_or_none()
        if not p:
            raise NotFoundException(f"Product '{product_id}' not found.")

        old_price = float(p.price)
        for k, v in data.items():
            if k not in ("specs",) and hasattr(p, k) and v is not None:
                setattr(p, k, v)

        if "price" in data and float(data["price"]) != old_price:
            ph = PriceHistory(product_id=p.id, price=data["price"], recorded_at=date.today())
            db.add(ph)

        if "specs" in data and isinstance(data["specs"], list):
            # Update specs
            for s in data["specs"]:
                defn_id = s.get("spec_definition_id")
                val = s.get("value")
                defn_stmt = select(SpecDefinition).where(SpecDefinition.id == defn_id)
                defn = (await db.execute(defn_stmt)).scalar_one_or_none()
                if defn:
                    spec_stmt = select(ProductSpec).where(
                        ProductSpec.product_id == p.id, ProductSpec.spec_definition_id == defn.id
                    )
                    existing = (await db.execute(spec_stmt)).scalar_one_or_none()
                    if existing:
                        existing.value_bool = bool(val) if defn.data_type == "boolean" else None
                        existing.value_number = (
                            float(val) if defn.data_type == "number" and val is not None else None
                        )
                        existing.value_text = (
                            str(val) if defn.data_type == "text" and val is not None else None
                        )
                    else:
                        ps = ProductSpec(
                            product_id=p.id,
                            spec_definition_id=defn.id,
                            value_bool=bool(val) if defn.data_type == "boolean" else None,
                            value_number=float(val)
                            if defn.data_type == "number" and val is not None
                            else None,
                            value_text=str(val)
                            if defn.data_type == "text" and val is not None
                            else None,
                        )
                        db.add(ps)

        await db.commit()
        await ValueScoreCalculator.recalculate_for_product(db, p.id)
        await cls.log_activity(
            db, admin.id, "updated", "product", p.id, {"updated_fields": list(data.keys())}
        )
        return await cls.get_product(db, p.id)

    @classmethod
    async def delete_product(cls, db: AsyncSession, admin: User, product_id: int) -> None:
        stmt = select(Product).where(Product.id == product_id)
        p = (await db.execute(stmt)).scalar_one_or_none()
        if not p:
            raise NotFoundException(f"Product '{product_id}' not found.")
        p.deleted_at = datetime.now(UTC).replace(tzinfo=None)
        await db.commit()
        await cls.log_activity(db, admin.id, "deleted", "product", p.id, {"name": p.name})

    @classmethod
    async def bulk_product_status(
        cls, db: AsyncSession, admin: User, product_ids: list[int], is_published: bool
    ) -> None:
        stmt = select(Product).where(Product.id.in_(product_ids))
        products = list((await db.execute(stmt)).scalars().all())
        for p in products:
            p.is_published = is_published
        await db.commit()
        await cls.log_activity(
            db,
            admin.id,
            "bulk_status",
            "product",
            None,
            {"count": len(products), "is_published": is_published},
        )

    # ---------------- Product Images CRUD ----------------
    @classmethod
    async def list_product_images(
        cls, db: AsyncSession, product_id: int
    ) -> list[AdminProductImage]:
        stmt = (
            select(ProductImage)
            .where(ProductImage.product_id == product_id)
            .order_by(ProductImage.sort_order, ProductImage.id)
        )
        imgs = list((await db.execute(stmt)).scalars().all())
        return [
            AdminProductImage(
                id=img.id,
                url=format_media_url(img.path),
                alt_text=img.alt_text,
                sort_order=img.sort_order,
                is_primary=img.is_primary,
            )
            for img in imgs
        ]

    @classmethod
    async def add_product_image(
        cls,
        db: AsyncSession,
        admin: User,
        product_id: int,
        path: str,
        alt_text: str = "",
        is_primary: bool = False,
    ) -> AdminProductImage:
        if is_primary:
            # Unset primary on others
            reset_stmt = select(ProductImage).where(ProductImage.product_id == product_id)
            for other in (await db.execute(reset_stmt)).scalars().all():
                other.is_primary = False

        img = ProductImage(
            product_id=product_id,
            path=path,
            alt_text=alt_text,
            is_primary=is_primary,
            sort_order=0,
        )
        db.add(img)
        await db.commit()
        await db.refresh(img)
        await cls.log_activity(
            db, admin.id, "image_uploaded", "product", product_id, {"image_id": img.id}
        )
        return AdminProductImage(
            id=img.id,
            url=format_media_url(img.path),
            alt_text=img.alt_text,
            sort_order=img.sort_order,
            is_primary=img.is_primary,
        )

    @classmethod
    async def reorder_product_images(
        cls,
        db: AsyncSession,
        admin: User,
        product_id: int,
        image_ids: list[int],
        primary_id: int | None = None,
    ) -> list[AdminProductImage]:
        stmt = select(ProductImage).where(ProductImage.product_id == product_id)
        imgs = {img.id: img for img in (await db.execute(stmt)).scalars().all()}

        for idx, img_id in enumerate(image_ids):
            if img_id in imgs:
                imgs[img_id].sort_order = idx
                if primary_id is not None:
                    imgs[img_id].is_primary = img_id == primary_id

        await db.commit()
        await cls.log_activity(db, admin.id, "images_reordered", "product", product_id)
        return await cls.list_product_images(db, product_id)

    @classmethod
    async def update_product_image(
        cls,
        db: AsyncSession,
        admin: User,
        product_id: int,
        image_id: int,
        alt_text: str | None = None,
        is_primary: bool | None = None,
        sort_order: int | None = None,
    ) -> AdminProductImage:
        stmt = select(ProductImage).where(
            ProductImage.id == image_id, ProductImage.product_id == product_id
        )
        img = (await db.execute(stmt)).scalar_one_or_none()
        if not img:
            raise NotFoundException(f"Product image '{image_id}' not found.")

        if is_primary:
            reset_stmt = select(ProductImage).where(ProductImage.product_id == product_id)
            for other in (await db.execute(reset_stmt)).scalars().all():
                other.is_primary = False
            img.is_primary = True
        elif is_primary is False:
            img.is_primary = False

        if alt_text is not None:
            img.alt_text = alt_text
        if sort_order is not None:
            img.sort_order = sort_order

        await db.commit()
        await cls.log_activity(
            db, admin.id, "image_updated", "product", product_id, {"image_id": image_id}
        )
        return AdminProductImage(
            id=img.id,
            url=format_media_url(img.path),
            alt_text=img.alt_text,
            sort_order=img.sort_order,
            is_primary=img.is_primary,
        )

    @classmethod
    async def delete_product_image(
        cls, db: AsyncSession, admin: User, product_id: int, image_id: int
    ) -> None:
        stmt = select(ProductImage).where(
            ProductImage.id == image_id, ProductImage.product_id == product_id
        )
        img = (await db.execute(stmt)).scalar_one_or_none()
        if not img:
            raise NotFoundException(f"Product image '{image_id}' not found.")
        await db.delete(img)
        await db.commit()
        await cls.log_activity(
            db, admin.id, "image_deleted", "product", product_id, {"image_id": image_id}
        )

    # ---------------- Users CRUD ----------------
    @classmethod
    async def list_users(
        cls,
        db: AsyncSession,
        search: str | None = None,
        role: str | None = None,
        is_active: bool | None = None,
        sort: str | None = None,
        page: int = 1,
        per_page: int = 25,
    ) -> tuple[list[AdminUser], int, int]:
        stmt = select(User)
        if search:
            stmt = stmt.where(or_(User.name.ilike(f"%{search}%"), User.email.ilike(f"%{search}%")))
        if role:
            stmt = stmt.where(User.role == role)
        if is_active is not None:
            stmt = stmt.where(User.is_active.is_(is_active))

        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(User.created_at.desc(), User.id.desc())
        offset = (page - 1) * per_page
        users = list((await db.execute(stmt.offset(offset).limit(per_page))).scalars().all())

        user_ids = [u.id for u in users]
        rev_counts: dict[int, int] = {}
        if user_ids:
            rc_stmt = (
                select(Review.user_id, func.count(Review.id))
                .where(Review.user_id.in_(user_ids))
                .group_by(Review.user_id)
            )
            for uid, cnt in (await db.execute(rc_stmt)).all():
                rev_counts[uid] = cnt

        items = [
            AdminUser(
                id=u.id,
                name=u.name,
                email=u.email,
                role=u.role,
                is_active=u.is_active,
                reviews_count=rev_counts.get(u.id, 0),
                preferences=u.preferences,
                created_at=u.created_at.isoformat() if u.created_at else "",
            )
            for u in users
        ]
        last_page = max(1, (total + per_page - 1) // per_page)
        return items, total, last_page

    @classmethod
    async def update_user(
        cls,
        db: AsyncSession,
        admin: User,
        user_id: int,
        is_active: bool | None = None,
        role: str | None = None,
    ) -> AdminUser:
        stmt = select(User).where(User.id == user_id)
        user = (await db.execute(stmt)).scalar_one_or_none()
        if not user:
            raise NotFoundException(f"User '{user_id}' not found.")
        if is_active is not None:
            user.is_active = is_active
        if role is not None:
            user.role = role
        await db.commit()
        await cls.log_activity(
            db, admin.id, "updated", "user", user.id, {"is_active": is_active, "role": role}
        )
        users, _, _ = await cls.list_users(db, search=user.email)
        return users[0]

    # ---------------- Reviews Moderation ----------------
    @classmethod
    async def list_reviews(
        cls,
        db: AsyncSession,
        status: str | None = None,
        search: str | None = None,
        rating: int | None = None,
        product_id: int | None = None,
        sort: str | None = None,
        page: int = 1,
        per_page: int = 25,
    ) -> tuple[list[AdminReview], int, int]:
        stmt = select(Review).options(
            selectinload(Review.product),
            selectinload(Review.user),
            selectinload(Review.moderator),
        )
        if status and status != "all":
            stmt = stmt.where(Review.status == status)
        if rating:
            stmt = stmt.where(Review.rating == rating)
        if product_id:
            stmt = stmt.where(Review.product_id == product_id)
        if search:
            stmt = stmt.where(
                or_(Review.title.ilike(f"%{search}%"), Review.body.ilike(f"%{search}%"))
            )

        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(Review.created_at.desc(), Review.id.desc())
        offset = (page - 1) * per_page
        reviews = list((await db.execute(stmt.offset(offset).limit(per_page))).scalars().all())

        items = [
            AdminReview(
                id=r.id,
                product={
                    "id": r.product.id,
                    "name": r.product.name,
                    "slug": r.product.slug,
                    "is_published": r.product.is_published,
                    "rating_avg": float(r.product.rating_avg),
                    "rating_count": r.product.rating_count,
                }
                if r.product
                else None,
                user={"id": r.user.id, "name": r.user.name, "email": r.user.email}
                if r.user
                else None,
                author_name=r.user.name if r.user else (r.author_name or "Customer"),
                rating=r.rating,
                title=r.title,
                body=r.body,
                status=r.status,
                moderator={
                    "id": r.moderator.id,
                    "name": r.moderator.name,
                    "email": r.moderator.email,
                }
                if r.moderator
                else None,
                moderated_by=r.moderated_by,
                moderated_at=r.moderated_at.isoformat() if r.moderated_at else None,
                created_at=r.created_at.isoformat() if r.created_at else "",
                updated_at=r.updated_at.isoformat() if r.updated_at else "",
            )
            for r in reviews
        ]
        last_page = max(1, (total + per_page - 1) // per_page)
        return items, total, last_page

    @classmethod
    async def moderate_review(
        cls, db: AsyncSession, admin: User, review_id: int, status: str
    ) -> AdminReview:
        stmt = select(Review).where(Review.id == review_id)
        r = (await db.execute(stmt)).scalar_one_or_none()
        if not r:
            raise NotFoundException(f"Review '{review_id}' not found.")

        r.status = status
        r.moderated_by = admin.id
        r.moderated_at = datetime.now(UTC).replace(tzinfo=None)
        await db.commit()

        # Recalculate product rating
        await ReviewService.recalculate_rating(db, r.product_id)
        await cls.log_activity(db, admin.id, f"review_{status}", "review", r.id)
        reviews, _, _ = await cls.list_reviews(db, product_id=r.product_id)
        for rev in reviews:
            if rev.id == review_id:
                return rev
        return reviews[0]

    @classmethod
    async def bulk_moderate_reviews(
        cls, db: AsyncSession, admin: User, review_ids: list[int], status: str
    ) -> int:
        stmt = select(Review).where(Review.id.in_(review_ids))
        reviews = list((await db.execute(stmt)).scalars().all())
        affected_prods = set()
        for r in reviews:
            r.status = status
            r.moderated_by = admin.id
            r.moderated_at = datetime.now(UTC).replace(tzinfo=None)
            affected_prods.add(r.product_id)
        await db.commit()

        for pid in affected_prods:
            await ReviewService.recalculate_rating(db, pid)

        await cls.log_activity(
            db, admin.id, f"bulk_review_{status}", "review", None, {"count": len(reviews)}
        )
        return len(reviews)

    @classmethod
    async def delete_review(cls, db: AsyncSession, admin: User, review_id: int) -> None:
        stmt = select(Review).where(Review.id == review_id)
        r = (await db.execute(stmt)).scalar_one_or_none()
        if not r:
            raise NotFoundException(f"Review '{review_id}' not found.")
        pid = r.product_id
        await db.delete(r)
        await db.commit()
        await ReviewService.recalculate_rating(db, pid)
        await cls.log_activity(db, admin.id, "deleted", "review", review_id)

    @classmethod
    async def regenerate_review_summary(
        cls, db: AsyncSession, admin: User, product_id: int
    ) -> None:
        revs_stmt = select(Review).where(
            Review.product_id == product_id, Review.status == "approved"
        )
        revs = list((await db.execute(revs_stmt)).scalars().all())
        if not revs:
            return

        pos = [r for r in revs if r.rating >= 4]
        neg = [r for r in revs if r.rating <= 2]
        sentiment = (
            "positive" if len(pos) > len(neg) else ("negative" if len(neg) > len(pos) else "mixed")
        )

        pros = [r.title for r in pos[:3]] or ["Reliable performance", "Great build quality"]
        cons = [r.title for r in neg[:2]] or ["Standard battery life"]
        summary_text = (
            "Customers generally praise the product's quality and features "
            f"with a {sentiment} reception overall."
        )

        sum_stmt = select(ReviewSummary).where(ReviewSummary.product_id == product_id)
        existing = (await db.execute(sum_stmt)).scalar_one_or_none()
        if existing:
            existing.summary = summary_text
            existing.pros = pros
            existing.cons = cons
            existing.sentiment = sentiment
            existing.reviews_count = len(revs)
            existing.generated_at = datetime.now(UTC).replace(tzinfo=None)
        else:
            rs = ReviewSummary(
                product_id=product_id,
                summary=summary_text,
                pros=pros,
                cons=cons,
                sentiment=sentiment,
                reviews_count=len(revs),
                generated_at=datetime.now(UTC).replace(tzinfo=None),
            )
            db.add(rs)
        await db.commit()
        await cls.log_activity(db, admin.id, "regenerated_summary", "product", product_id)

    # ---------------- AI Usage & Activity Logs ----------------
    @classmethod
    async def get_ai_usage(
        cls,
        db: AsyncSession,
        start_date: str | None = None,
        end_date: str | None = None,
        feature: str | None = None,
        status: str | None = None,
        user_id: int | None = None,
        page: int = 1,
        per_page: int = 25,
    ) -> AdminAiUsageData:
        now_naive = datetime.now(UTC).replace(tzinfo=None)
        start_dt = (
            datetime.strptime(start_date, "%Y-%m-%d")
            if start_date
            else now_naive - timedelta(days=30)
        )
        end_dt = (
            datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            if end_date
            else now_naive + timedelta(days=1)
        )

        stmt = select(AiUsageLog).where(
            AiUsageLog.created_at >= start_dt, AiUsageLog.created_at <= end_dt
        )
        if feature and feature != "all":
            stmt = stmt.where(AiUsageLog.feature == feature)
        if status and status != "all":
            stmt = stmt.where(AiUsageLog.status == status)
        if user_id:
            stmt = stmt.where(AiUsageLog.user_id == user_id)

        # Detailed summary
        sum_stmt = select(
            func.count(AiUsageLog.id).label("total"),
            func.coalesce(func.sum(case((AiUsageLog.status == "ok", 1), else_=0)), 0).label(
                "success"
            ),
            func.coalesce(func.sum(case((AiUsageLog.status != "ok", 1), else_=0)), 0).label(
                "failed"
            ),
            func.coalesce(func.sum(case((AiUsageLog.status == "error", 1), else_=0)), 0).label(
                "error_calls"
            ),
            func.coalesce(
                func.sum(case((AiUsageLog.status == "rate_limited", 1), else_=0)), 0
            ).label("rate_limited_calls"),
            func.coalesce(func.sum(AiUsageLog.prompt_tokens), 0).label("p_tokens"),
            func.coalesce(func.sum(AiUsageLog.completion_tokens), 0).label("c_tokens"),
            func.coalesce(func.avg(AiUsageLog.latency_ms), 0).label("avg_lat"),
        ).where(AiUsageLog.created_at >= start_dt, AiUsageLog.created_at <= end_dt)
        row = (await db.execute(sum_stmt)).one()
        total_calls = int(row.total or 0)
        failed_calls = int(row.failed or 0)
        error_rate = round(failed_calls / total_calls, 4) if total_calls > 0 else 0.0

        detailed_summary = AdminAiUsageDetailedSummary(
            total_calls=total_calls,
            successful_calls=int(row.success or 0),
            failed_calls=failed_calls,
            error_calls=int(row.error_calls or 0),
            rate_limited_calls=int(row.rate_limited_calls or 0),
            error_rate=error_rate,
            total_tokens=int((row.p_tokens or 0) + (row.c_tokens or 0)),
            prompt_tokens=int(row.p_tokens or 0),
            completion_tokens=int(row.c_tokens or 0),
            avg_latency_ms=round(float(row.avg_lat or 0), 1),
        )

        # By feature
        feat_stmt = (
            select(
                AiUsageLog.feature,
                func.count(AiUsageLog.id).label("total"),
                func.coalesce(func.sum(case((AiUsageLog.status == "ok", 1), else_=0)), 0).label(
                    "success"
                ),
                func.coalesce(func.sum(case((AiUsageLog.status != "ok", 1), else_=0)), 0).label(
                    "failed"
                ),
                func.coalesce(
                    func.sum(AiUsageLog.prompt_tokens + AiUsageLog.completion_tokens), 0
                ).label("tokens"),
                func.coalesce(func.avg(AiUsageLog.latency_ms), 0).label("avg_lat"),
            )
            .where(AiUsageLog.created_at >= start_dt, AiUsageLog.created_at <= end_dt)
            .group_by(AiUsageLog.feature)
        )
        feat_rows = (await db.execute(feat_stmt)).all()
        by_feature = [
            AdminAiFeatureBreakdown(
                feature=r[0],
                total_calls=r[1],
                successful_calls=r[2],
                failed_calls=r[3],
                total_tokens=int(r[4] or 0),
                avg_latency_ms=round(float(r[5] or 0), 1),
            )
            for r in feat_rows
        ]

        # Guest calls
        guest_stmt = select(func.count(AiUsageLog.id)).where(
            AiUsageLog.created_at >= start_dt,
            AiUsageLog.created_at <= end_dt,
            AiUsageLog.user_id.is_(None),
        )
        guest_calls = (await db.execute(guest_stmt)).scalar() or 0

        # Paginated logs
        count_logs_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total_logs = (await db.execute(count_logs_stmt)).scalar() or 0

        offset = (page - 1) * per_page
        logs_stmt = stmt.order_by(AiUsageLog.created_at.desc()).offset(offset).limit(per_page)
        logs = list((await db.execute(logs_stmt)).scalars().all())

        user_ids = [entry.user_id for entry in logs if entry.user_id]
        users_map = {}
        if user_ids:
            u_stmt = select(User).where(User.id.in_(user_ids))
            for u in (await db.execute(u_stmt)).scalars().all():
                users_map[u.id] = {"id": u.id, "name": u.name, "email": u.email}

        log_items = [
            AdminAiUsageLogItem(
                id=entry.id,
                user=users_map.get(entry.user_id),
                feature=entry.feature,
                model=entry.model,
                prompt_tokens=entry.prompt_tokens,
                completion_tokens=entry.completion_tokens,
                total_tokens=(entry.prompt_tokens or 0) + (entry.completion_tokens or 0),
                latency_ms=entry.latency_ms,
                status=entry.status,
                error_code=entry.error_code,
                created_at=entry.created_at.isoformat(),
            )
            for entry in logs
        ]

        last_p = max(1, (total_logs + per_page - 1) // per_page)
        pagination = AdminAiUsagePagination(
            current_page=page,
            last_page=last_p,
            per_page=per_page,
            total=total_logs,
        )

        return AdminAiUsageData(
            summary=detailed_summary,
            by_feature=by_feature,
            daily_usage=[],
            top_users=[],
            guest_calls=guest_calls,
            logs=log_items,
            pagination=pagination,
            date_range={
                "start_date": start_dt.strftime("%Y-%m-%d"),
                "end_date": (end_dt - timedelta(days=1)).strftime("%Y-%m-%d"),
            },
        )

    @classmethod
    async def get_activity_logs(
        cls,
        db: AsyncSession,
        start_date: str | None = None,
        end_date: str | None = None,
        admin_id: int | None = None,
        action: str | None = None,
        subject_type: str | None = None,
        search: str | None = None,
        page: int = 1,
        per_page: int = 25,
    ) -> tuple[list[AdminActivityItem], int, int]:
        stmt = select(AdminActivityLog).options(selectinload(AdminActivityLog.admin))
        if start_date:
            stmt = stmt.where(
                AdminActivityLog.created_at >= datetime.strptime(start_date, "%Y-%m-%d")
            )
        if end_date:
            stmt = stmt.where(
                AdminActivityLog.created_at
                <= datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            )
        if admin_id:
            stmt = stmt.where(AdminActivityLog.admin_id == admin_id)
        if action and action != "all":
            stmt = stmt.where(AdminActivityLog.action == action)
        if subject_type and subject_type != "all":
            stmt = stmt.where(AdminActivityLog.subject_type == subject_type)
        if search:
            stmt = stmt.where(AdminActivityLog.action.ilike(f"%{search}%"))

        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(AdminActivityLog.created_at.desc())
        offset = (page - 1) * per_page
        logs = list((await db.execute(stmt.offset(offset).limit(per_page))).scalars().all())

        items = [
            AdminActivityItem(
                id=a.id,
                admin={"id": a.admin.id, "name": a.admin.name, "email": a.admin.email}
                if a.admin
                else None,
                action=a.action,
                subject_type=a.subject_type,
                subject_id=a.subject_id,
                changes=a.changes,
                ip_address=a.ip_address,
                created_at=a.created_at.isoformat(),
            )
            for a in logs
        ]
        last_page = max(1, (total + per_page - 1) // per_page)
        return items, total, last_page
