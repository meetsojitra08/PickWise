from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.exceptions import NotFoundException
from app.core.response import MoneyAmount
from app.models import Brand, Category, PriceHistory, Product, ProductImage, ProductSpec, ReviewSummary, SpecDefinition
from app.schemas.catalog import (
    AvailabilityFacetOut,
    BrandFacetOut,
    BrandOut,
    CategoryFiltersOut,
    CategoryOut,
    NumericRange,
    PriceHistoryPointOut,
    PriceRangeFacetOut,
    PrimaryImageOut,
    ProductCardOut,
    ProductDetailOut,
    ProductImageOut,
    ProductPriceHistoryOut,
    ProductSpecOut,
    ReviewSummaryOut,
    SpecFacetOut,
    SpecOptionFacetOut,
    format_media_url,
)

AVAILABILITY_CASES = [
    ("in_stock", "In Stock"),
    ("low_stock", "Low Stock"),
    ("out_of_stock", "Out of Stock"),
    ("discontinued", "Discontinued"),
]


def format_availability_label(status: str) -> str:
    mapping = dict(AVAILABILITY_CASES)
    return mapping.get(status, status.replace("_", " ").title())


def to_product_card(product: Product) -> ProductCardOut:
    primary_img = None
    for img in product.images:
        if img.is_primary:
            primary_img = PrimaryImageOut(id=img.id, url=format_media_url(img.path), alt_text=img.alt_text)
            break
    if not primary_img and product.images:
        primary_img = PrimaryImageOut(id=product.images[0].id, url=format_media_url(product.images[0].path), alt_text=product.images[0].alt_text)

    cat_data = None
    if product.category:
        cat_data = {"id": product.category.id, "name": product.category.name, "slug": product.category.slug}

    brand_data = None
    if product.brand:
        brand_data = BrandOut(
            id=product.brand.id,
            name=product.brand.name,
            slug=product.brand.slug,
            logo_url=format_media_url(product.brand.logo_path),
        )

    return ProductCardOut(
        id=product.id,
        name=product.name,
        slug=product.slug,
        summary=product.summary,
        price=MoneyAmount(amount=f"{float(product.price):.2f}", currency=product.currency),
        availability=product.availability,
        availability_label=format_availability_label(product.availability),
        rating_avg=round(float(product.rating_avg), 2),
        rating_count=product.rating_count,
        value_score=product.value_score,
        category=cat_data,
        brand=brand_data,
        primary_image=primary_img,
    )


class CatalogService:
    @classmethod
    async def get_category_descendant_ids(cls, db: AsyncSession, root_category_id: int) -> List[int]:
        cats_stmt = select(Category.id, Category.parent_id).where(Category.is_active.is_(True))
        rows = (await db.execute(cats_stmt)).all()
        child_map: Dict[int, List[int]] = {}
        for cid, pid in rows:
            if pid:
                child_map.setdefault(pid, []).append(cid)

        result = [root_category_id]
        queue = [root_category_id]
        while queue:
            curr = queue.pop(0)
            for child in child_map.get(curr, []):
                result.append(child)
                queue.append(child)
        return result

    @classmethod
    async def get_categories_tree(cls, db: AsyncSession) -> List[CategoryOut]:
        prod_count_stmt = (
            select(Product.category_id, func.count(Product.id).label("count"))
            .where(Product.is_published.is_(True), Product.deleted_at.is_(None))
            .group_by(Product.category_id)
        )
        count_res = await db.execute(prod_count_stmt)
        count_map = {row[0]: row[1] for row in count_res.all()}

        cats_stmt = (
            select(Category)
            .where(Category.is_active.is_(True))
            .order_by(Category.sort_order, Category.name)
        )
        categories = list((await db.execute(cats_stmt)).scalars().all())

        cat_dict: Dict[int, CategoryOut] = {}
        roots: List[CategoryOut] = []

        for c in categories:
            node = CategoryOut(
                id=c.id,
                parent_id=c.parent_id,
                name=c.name,
                slug=c.slug,
                description=c.description,
                image_url=format_media_url(c.image_path),
                sort_order=c.sort_order,
                products_count=count_map.get(c.id, 0),
                children=[],
            )
            cat_dict[c.id] = node

        for c in categories:
            node = cat_dict[c.id]
            if c.parent_id and c.parent_id in cat_dict:
                parent = cat_dict[c.parent_id]
                if parent.children is None:
                    parent.children = []
                parent.children.append(node)
            else:
                roots.append(node)

        return roots

    @classmethod
    async def get_category_filters(cls, db: AsyncSession, slug: str) -> CategoryFiltersOut:
        cat_stmt = select(Category).where(Category.slug == slug, Category.is_active.is_(True))
        category = (await db.execute(cat_stmt)).scalar_one_or_none()
        if not category:
            raise NotFoundException(f"Category '{slug}' not found.")

        category_ids = await cls.get_category_descendant_ids(db, category.id)

        # Price range aggregate
        price_stmt = (
            select(
                func.count(Product.id),
                func.min(Product.price),
                func.max(Product.price),
                func.min(Product.currency),
            )
            .where(
                Product.category_id.in_(category_ids),
                Product.is_published.is_(True),
                Product.deleted_at.is_(None),
            )
        )
        price_row = (await db.execute(price_stmt)).one()
        prod_count = price_row[0] or 0
        min_p = price_row[1]
        max_p = price_row[2]
        currency = price_row[3] or "USD"

        price_range = PriceRangeFacetOut(
            min=MoneyAmount(amount=f"{float(min_p):.2f}", currency=currency) if min_p is not None else None,
            max=MoneyAmount(amount=f"{float(max_p):.2f}", currency=currency) if max_p is not None else None,
        )

        # Brands
        brands_stmt = (
            select(Brand.id, Brand.name, Brand.slug, Brand.logo_path, func.count(Product.id))
            .join(Product, Product.brand_id == Brand.id)
            .where(
                Product.category_id.in_(category_ids),
                Product.is_published.is_(True),
                Product.deleted_at.is_(None),
            )
            .group_by(Brand.id, Brand.name, Brand.slug, Brand.logo_path)
            .order_by(Brand.name)
        )
        brands_res = await db.execute(brands_stmt)
        brand_facets = [
            BrandFacetOut(
                id=r[0],
                name=r[1],
                slug=r[2],
                logo_url=format_media_url(r[3]),
                products_count=r[4],
            )
            for r in brands_res.all()
        ]

        # Availability
        avail_stmt = (
            select(Product.availability, func.count(Product.id))
            .where(
                Product.category_id.in_(category_ids),
                Product.is_published.is_(True),
                Product.deleted_at.is_(None),
            )
            .group_by(Product.availability)
        )
        avail_res = await db.execute(avail_stmt)
        avail_counts = {r[0]: r[1] for r in avail_res.all()}
        avail_facets = [
            AvailabilityFacetOut(
                value=case_val,
                label=case_lbl,
                products_count=avail_counts.get(case_val, 0),
            )
            for case_val, case_lbl in AVAILABILITY_CASES
        ]

        # Filterable specs
        specs_stmt = (
            select(SpecDefinition)
            .where(
                SpecDefinition.category_id == category.id,
                SpecDefinition.is_filterable.is_(True),
            )
            .order_by(SpecDefinition.sort_order, SpecDefinition.label)
        )
        spec_defs = list((await db.execute(specs_stmt)).scalars().all())

        spec_facets: List[SpecFacetOut] = []
        for s in spec_defs:
            if s.data_type == "number":
                num_stmt = (
                    select(func.min(ProductSpec.value_number), func.max(ProductSpec.value_number))
                    .join(Product, Product.id == ProductSpec.product_id)
                    .where(
                        ProductSpec.spec_definition_id == s.id,
                        Product.category_id.in_(category_ids),
                        Product.is_published.is_(True),
                        Product.deleted_at.is_(None),
                    )
                )
                min_max = (await db.execute(num_stmt)).one()
                spec_facets.append(
                    SpecFacetOut(
                        key=s.key,
                        label=s.label,
                        unit=s.unit,
                        data_type=s.data_type,
                        range=NumericRange(
                            min=float(min_max[0]) if min_max[0] is not None else None,
                            max=float(min_max[1]) if min_max[1] is not None else None,
                        ),
                    )
                )
            elif s.data_type == "boolean":
                opts_stmt = (
                    select(ProductSpec.value_bool, func.count(Product.id))
                    .join(Product, Product.id == ProductSpec.product_id)
                    .where(
                        ProductSpec.spec_definition_id == s.id,
                        Product.category_id.in_(category_ids),
                        Product.is_published.is_(True),
                        Product.deleted_at.is_(None),
                        ProductSpec.value_bool.is_not(None),
                    )
                    .group_by(ProductSpec.value_bool)
                    .order_by(ProductSpec.value_bool.desc())
                )
                opts_res = await db.execute(opts_stmt)
                options = [
                    SpecOptionFacetOut(
                        value=bool(r[0]),
                        label="Yes" if r[0] else "No",
                        products_count=r[1],
                    )
                    for r in opts_res.all()
                ]
                spec_facets.append(
                    SpecFacetOut(
                        key=s.key,
                        label=s.label,
                        unit=s.unit,
                        data_type=s.data_type,
                        options=options,
                    )
                )
            else:
                opts_stmt = (
                    select(ProductSpec.value_text, func.count(Product.id))
                    .join(Product, Product.id == ProductSpec.product_id)
                    .where(
                        ProductSpec.spec_definition_id == s.id,
                        Product.category_id.in_(category_ids),
                        Product.is_published.is_(True),
                        Product.deleted_at.is_(None),
                        ProductSpec.value_text.is_not(None),
                    )
                    .group_by(ProductSpec.value_text)
                    .order_by(ProductSpec.value_text)
                )
                opts_res = await db.execute(opts_stmt)
                options = [
                    SpecOptionFacetOut(
                        value=str(r[0]),
                        label=str(r[0]),
                        products_count=r[1],
                    )
                    for r in opts_res.all()
                ]
                spec_facets.append(
                    SpecFacetOut(
                        key=s.key,
                        label=s.label,
                        unit=s.unit,
                        data_type=s.data_type,
                        options=options,
                    )
                )

        cat_out = CategoryOut(
            id=category.id,
            parent_id=category.parent_id,
            name=category.name,
            slug=category.slug,
            description=category.description,
            image_url=format_media_url(category.image_path),
            sort_order=category.sort_order,
            products_count=prod_count,
        )

        return CategoryFiltersOut(
            category=cat_out,
            price_range=price_range,
            brands=brand_facets,
            availability=avail_facets,
            specs=spec_facets,
        )

    @classmethod
    async def search_products(
        cls,
        db: AsyncSession,
        query_text: Optional[str] = None,
        category_slug: Optional[str] = None,
        brand_slugs: Optional[List[str]] = None,
        price_min: Optional[float] = None,
        price_max: Optional[float] = None,
        rating_min: Optional[float] = None,
        availability: Optional[str] = None,
        spec_filters: Optional[Dict[str, str]] = None,
        sort: str = "relevance",
        page: int = 1,
        per_page: int = 24,
    ) -> Tuple[List[ProductCardOut], int, int]:
        stmt = (
            select(Product)
            .where(Product.is_published.is_(True), Product.deleted_at.is_(None))
            .options(
                selectinload(Product.category),
                selectinload(Product.brand),
                selectinload(Product.images),
            )
        )

        # Category filter (includes descendants)
        if category_slug:
            cat_stmt = select(Category.id).where(Category.slug == category_slug)
            cat_id = (await db.execute(cat_stmt)).scalar_one_or_none()
            if cat_id:
                cat_ids = await cls.get_category_descendant_ids(db, cat_id)
                stmt = stmt.where(Product.category_id.in_(cat_ids))

        # Brand filter
        if brand_slugs:
            b_stmt = select(Brand.id).where(Brand.slug.in_(brand_slugs))
            b_ids = list((await db.execute(b_stmt)).scalars().all())
            if b_ids:
                stmt = stmt.where(Product.brand_id.in_(b_ids))
            else:
                stmt = stmt.where(Product.brand_id == -1)

        # Price filters
        if price_min is not None:
            stmt = stmt.where(Product.price >= price_min)
        if price_max is not None:
            stmt = stmt.where(Product.price <= price_max)

        # Rating filter
        if rating_min is not None:
            stmt = stmt.where(Product.rating_avg >= rating_min)

        # Availability filter
        if availability:
            stmt = stmt.where(Product.availability == availability)

        # Dynamic spec filters
        if spec_filters:
            for spec_key, spec_val in spec_filters.items():
                defn_stmt = select(SpecDefinition).where(SpecDefinition.key == spec_key)
                defn = (await db.execute(defn_stmt)).scalar_one_or_none()
                if not defn:
                    continue

                if ":" in spec_val:
                    p_min, p_max = spec_val.split(":", 1)
                    subq = select(ProductSpec.product_id).where(
                        ProductSpec.spec_definition_id == defn.id,
                        ProductSpec.value_number >= float(p_min),
                        ProductSpec.value_number <= float(p_max),
                    )
                    stmt = stmt.where(Product.id.in_(subq))
                elif defn.data_type == "boolean":
                    bool_v = spec_val.lower() in ("true", "1", "yes")
                    subq = select(ProductSpec.product_id).where(
                        ProductSpec.spec_definition_id == defn.id,
                        ProductSpec.value_bool == bool_v,
                    )
                    stmt = stmt.where(Product.id.in_(subq))
                elif defn.data_type == "number":
                    subq = select(ProductSpec.product_id).where(
                        ProductSpec.spec_definition_id == defn.id,
                        ProductSpec.value_number == float(spec_val),
                    )
                    stmt = stmt.where(Product.id.in_(subq))
                else:
                    subq = select(ProductSpec.product_id).where(
                        ProductSpec.spec_definition_id == defn.id,
                        ProductSpec.value_text == spec_val,
                    )
                    stmt = stmt.where(Product.id.in_(subq))

        # Search query
        if query_text and query_text.strip():
            clean_q = query_text.strip()
            search_clause = or_(
                Product.search_vector.op("@@")(func.plainto_tsquery("english", clean_q)),
                func.similarity(Product.name, clean_q) > 0.2,
            )
            stmt = stmt.where(search_clause)

        # Total count
        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        # Sorting
        if sort == "price_asc":
            stmt = stmt.order_by(Product.price.asc(), Product.id.asc())
        elif sort == "price_desc":
            stmt = stmt.order_by(Product.price.desc(), Product.id.asc())
        elif sort == "rating":
            stmt = stmt.order_by(Product.rating_avg.desc(), Product.rating_count.desc(), Product.id.asc())
        elif sort == "value":
            stmt = stmt.order_by(Product.value_score.desc().nullslast(), Product.rating_avg.desc(), Product.id.asc())
        elif sort == "newest":
            stmt = stmt.order_by(Product.created_at.desc(), Product.id.asc())
        else:
            if query_text and query_text.strip():
                clean_q = query_text.strip()
                rank_expr = func.ts_rank(Product.search_vector, func.plainto_tsquery("english", clean_q)) + func.similarity(Product.name, clean_q)
                stmt = stmt.order_by(rank_expr.desc(), Product.value_score.desc().nullslast())
            else:
                stmt = stmt.order_by(Product.value_score.desc().nullslast(), Product.rating_avg.desc(), Product.id.asc())

        # Pagination
        offset = (page - 1) * per_page
        stmt = stmt.offset(offset).limit(per_page)

        products = list((await db.execute(stmt)).scalars().all())
        cards = [to_product_card(p) for p in products]
        last_page = max(1, (total + per_page - 1) // per_page)

        return cards, total, last_page

    @classmethod
    async def get_product_detail(cls, db: AsyncSession, slug: str) -> ProductDetailOut:
        stmt = (
            select(Product)
            .where(Product.slug == slug, Product.is_published.is_(True), Product.deleted_at.is_(None))
            .options(
                selectinload(Product.category),
                selectinload(Product.brand),
                selectinload(Product.images),
                selectinload(Product.specs).selectinload(ProductSpec.spec_definition),
                selectinload(Product.summary_rel),
            )
        )
        product = (await db.execute(stmt)).scalar_one_or_none()
        if not product:
            raise NotFoundException(f"Product '{slug}' not found.")

        card = to_product_card(product)

        images = [
            ProductImageOut(
                id=img.id,
                url=format_media_url(img.path),
                alt_text=img.alt_text,
                sort_order=img.sort_order,
                is_primary=img.is_primary,
            )
            for img in product.images
        ]

        specs = [
            ProductSpecOut(
                key=s.spec_definition.key,
                label=s.spec_definition.label,
                unit=s.spec_definition.unit,
                data_type=s.spec_definition.data_type,
                value=s.value_bool if s.spec_definition.data_type == "boolean" else (float(s.value_number) if s.spec_definition.data_type == "number" and s.value_number is not None else s.value_text),
                is_comparable=s.spec_definition.is_comparable,
                higher_is_better=s.spec_definition.higher_is_better,
            )
            for s in product.specs
        ]

        summary_out = None
        if product.summary_rel:
            summary_out = ReviewSummaryOut(
                summary=product.summary_rel.summary,
                pros=product.summary_rel.pros,
                cons=product.summary_rel.cons,
                sentiment=product.summary_rel.sentiment,
                reviews_count=product.summary_rel.reviews_count,
                generated_at=product.summary_rel.generated_at.isoformat() if product.summary_rel.generated_at else "",
            )

        return ProductDetailOut(
            id=product.id,
            name=product.name,
            slug=product.slug,
            summary=product.summary,
            description=product.description,
            price=card.price,
            availability=product.availability,
            availability_label=card.availability_label,
            store_url=product.store_url,
            rating_avg=card.rating_avg,
            rating_count=product.rating_count,
            value_score=product.value_score,
            category=card.category,
            brand=card.brand,
            primary_image=card.primary_image,
            images=images,
            specs=specs,
            review_summary=summary_out,
            created_at=product.created_at.isoformat() if product.created_at else None,
            updated_at=product.updated_at.isoformat() if product.updated_at else None,
        )

    @classmethod
    async def get_price_history(cls, db: AsyncSession, slug: str) -> ProductPriceHistoryOut:
        prod_stmt = select(Product).where(Product.slug == slug, Product.is_published.is_(True), Product.deleted_at.is_(None))
        product = (await db.execute(prod_stmt)).scalar_one_or_none()
        if not product:
            raise NotFoundException(f"Product '{slug}' not found.")

        stmt = (
            select(PriceHistory.price, PriceHistory.recorded_at)
            .where(PriceHistory.product_id == product.id)
            .order_by(PriceHistory.recorded_at.asc())
        )
        rows = list((await db.execute(stmt)).all())
        points = [
            PriceHistoryPointOut(
                recorded_at=r[1].isoformat(),
                price=MoneyAmount(amount=f"{float(r[0]):.2f}", currency=product.currency),
            )
            for r in rows
        ]
        return ProductPriceHistoryOut(currency=product.currency, points=points)

    @classmethod
    async def get_similar_products(cls, db: AsyncSession, slug: str) -> List[ProductCardOut]:
        prod_stmt = select(Product).where(Product.slug == slug, Product.is_published.is_(True), Product.deleted_at.is_(None))
        current = (await db.execute(prod_stmt)).scalar_one_or_none()
        if not current:
            raise NotFoundException(f"Product '{slug}' not found.")

        p_min = float(current.price) * 0.6
        p_max = float(current.price) * 1.4
        sim_stmt = (
            select(Product)
            .where(
                Product.category_id == current.category_id,
                Product.id != current.id,
                Product.is_published.is_(True),
                Product.deleted_at.is_(None),
                Product.price >= p_min,
                Product.price <= p_max,
            )
            .options(
                selectinload(Product.category),
                selectinload(Product.brand),
                selectinload(Product.images),
            )
            .order_by(Product.value_score.desc().nullslast(), Product.rating_avg.desc())
            .limit(6)
        )
        sim_prods = list((await db.execute(sim_stmt)).scalars().all())
        return [to_product_card(p) for p in sim_prods]
