import asyncio
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import select

from app.core.security import generate_share_token, hash_password
from app.db.init_db import init_database
from app.db.session import AsyncSessionLocal
from app.models import (
    Brand,
    Category,
    Comparison,
    ComparisonItem,
    PriceHistory,
    Product,
    ProductImage,
    ProductSpec,
    Review,
    ReviewSummary,
    SpecDefinition,
    User,
    WishlistItem,
)
from app.services.value_score import ValueScoreCalculator

PRICE_CHECKPOINT_DAYS_AGO = [180, 165, 150, 135, 120, 105, 90, 75, 60, 45, 30, 15, 0]

PRICE_PROFILES = {
    "recent_drop": [112, 112, 110, 110, 108, 108, 106, 106, 105, 104, 102, 100, 100],
    "festival_dip": [108, 108, 105, 104, 96, 94, 98, 103, 103, 101, 99, 100, 100],
    "gradual_drop": [115, 114, 112, 111, 109, 108, 106, 105, 104, 102, 101, 100, 100],
    "steady": [102, 102, 100, 100, 100, 99, 99, 100, 101, 100, 100, 100, 100],
    "launch_premium": [118, 118, 115, 115, 110, 110, 107, 105, 105, 103, 102, 100, 100],
    "rebound": [104, 102, 98, 95, 93, 95, 97, 99, 101, 101, 100, 100, 100],
}


def round_historical_rupees(raw_rupees: int, current_rupees: int) -> int:
    step = 500 if current_rupees >= 20000 else (100 if current_rupees >= 5000 else 50)
    rounded = ((raw_rupees + (step // 2)) // step) * step
    if current_rupees % 100 == 99 and rounded > 100:
        rounded -= 1
    elif current_rupees % 100 == 90 and rounded > 100:
        rounded -= 10
    return max(100, rounded)


async def seed_all():
    print("Initializing database...")
    await init_database()

    seed_file = Path(__file__).parent / "seeds" / "seed_data.json"
    if not seed_file.exists():
        print(f"Error: {seed_file} not found!")
        return

    with open(seed_file, encoding="utf-8") as f:
        data = json.load(f)

    async with AsyncSessionLocal() as db:
        print("Seeding Users...")
        admin = (
            await db.execute(select(User).where(User.email == "admin@pickwise.test"))
        ).scalar_one_or_none()
        if not admin:
            admin = User(
                name="Demo Admin",
                email="admin@pickwise.test",
                password=hash_password("password"),
                role="admin",
                is_active=True,
                email_verified_at=datetime.now(UTC),
            )
            db.add(admin)

        customer = (
            await db.execute(select(User).where(User.email == "customer@pickwise.test"))
        ).scalar_one_or_none()
        if not customer:
            customer = User(
                name="Demo Customer",
                email="customer@pickwise.test",
                password=hash_password("password"),
                role="customer",
                is_active=True,
                preferences={
                    "budget_default": 150000,
                    "favourite_categories": ["laptops", "smartphones", "headphones"],
                    "priorities": ["battery_life", "performance", "value_for_money"],
                },
                email_verified_at=datetime.now(UTC),
            )
            db.add(customer)

        test_user = (
            await db.execute(select(User).where(User.email == "test@example.com"))
        ).scalar_one_or_none()
        if not test_user:
            test_user = User(
                name="Test User",
                email="test@example.com",
                password=hash_password("password"),
                role="customer",
                is_active=True,
                email_verified_at=datetime.now(UTC),
            )
            db.add(test_user)

        await db.commit()
        await db.refresh(admin)
        await db.refresh(customer)
        await db.refresh(test_user)

        print("Seeding Brands...")
        brand_map: dict[str, Brand] = {}
        for b_data in data["brands"]:
            slug = b_data["slug"]
            brand = (await db.execute(select(Brand).where(Brand.slug == slug))).scalar_one_or_none()
            if not brand:
                brand = Brand(
                    name=b_data["name"], slug=slug, logo_path=f"/storage/brands/{slug}.svg"
                )
                db.add(brand)
                await db.flush()
            brand_map[slug] = brand

        print("Seeding Categories & Spec Definitions...")
        cat_map: dict[str, Category] = {}
        for c_data in data["categories"]:
            slug = c_data["slug"]
            cat = (
                await db.execute(select(Category).where(Category.slug == slug))
            ).scalar_one_or_none()
            if not cat:
                cat = Category(
                    name=c_data["name"],
                    slug=slug,
                    description=c_data.get("description"),
                    image_path=f"/storage/categories/{slug}.svg",
                    sort_order=c_data.get("sort_order", 0),
                    is_active=True,
                )
                db.add(cat)
                await db.flush()
            cat_map[slug] = cat

        await db.commit()

        # Seed Catalog Products
        print("Seeding Products, Specs, Media & Price Histories...")
        now = datetime.now(UTC)
        today = now.date()
        seeded_products: list[Product] = []

        for cat_slug, cat_catalog in data["catalog"].items():
            category = cat_map[cat_slug]

            # Seed Specs
            spec_def_map: dict[str, SpecDefinition] = {}
            for s_data in cat_catalog["spec_definitions"]:
                key = s_data["key"]
                spec_def = (
                    await db.execute(
                        select(SpecDefinition).where(
                            SpecDefinition.category_id == category.id, SpecDefinition.key == key
                        )
                    )
                ).scalar_one_or_none()
                if not spec_def:
                    spec_def = SpecDefinition(
                        category_id=category.id,
                        label=s_data["name"],
                        key=key,
                        unit=s_data.get("unit"),
                        data_type=s_data.get("data_type", "text"),
                        is_filterable=s_data.get("is_filterable", False),
                        is_comparable=s_data.get("is_comparable", False),
                        higher_is_better=s_data.get("higher_is_better"),
                        sort_order=s_data.get("sort_order", 0),
                    )
                    db.add(spec_def)
                    await db.flush()
                spec_def_map[key] = spec_def

            # Seed Products
            for p_data in cat_catalog["products"]:
                slug = p_data["slug"]
                brand = brand_map[p_data["brand_slug"]]
                product = (
                    await db.execute(select(Product).where(Product.slug == slug))
                ).scalar_one_or_none()

                price_rupees = float(p_data["price_rupees"])

                if not product:
                    product = Product(
                        category_id=category.id,
                        brand_id=brand.id,
                        name=p_data["name"],
                        slug=slug,
                        summary=p_data.get("summary") or p_data.get("name"),
                        description=p_data.get("description")
                        or p_data.get("summary")
                        or p_data.get("name"),
                        price=price_rupees,
                        currency="INR",
                        availability=p_data.get("availability", "in_stock"),
                        store_url=f"https://www.amazon.in/dp/{slug}",
                        rating_avg=float(p_data.get("rating_avg", 0.0)),
                        rating_count=int(p_data.get("rating_count", 0)),
                        is_published=True,
                    )
                    db.add(product)
                    await db.flush()

                    # Image
                    img = ProductImage(
                        product_id=product.id,
                        path=f"/storage/products/{slug}-1.webp",
                        alt_text=f"{product.name} product photo",
                        sort_order=1,
                        is_primary=True,
                    )
                    db.add(img)

                    # Specs
                    for spec_key, spec_val in p_data.get("specs", {}).items():
                        if spec_key not in spec_def_map:
                            continue
                        defn = spec_def_map[spec_key]
                        raw_val = str(spec_val)
                        num_val = (
                            float(spec_val)
                            if defn.data_type == "number" and isinstance(spec_val, (int, float))
                            else None
                        )
                        bool_val = (
                            bool(spec_val)
                            if defn.data_type == "boolean" and isinstance(spec_val, bool)
                            else None
                        )

                        ps = ProductSpec(
                            product_id=product.id,
                            spec_definition_id=defn.id,
                            value_text=raw_val
                            if defn.data_type not in ("number", "boolean")
                            else None,
                            value_number=num_val,
                            value_bool=bool_val,
                        )
                        db.add(ps)

                    # Price History
                    profile = p_data.get("price_profile", "steady")
                    percentages = PRICE_PROFILES.get(profile, PRICE_PROFILES["steady"])
                    for idx, days_ago in enumerate(PRICE_CHECKPOINT_DAYS_AGO):
                        rec_date = today - timedelta(days=days_ago)
                        if days_ago == 0:
                            hist_price = price_rupees
                        else:
                            pct = percentages[idx]
                            raw = int(price_rupees * pct / 100)
                            hist_price = float(round_historical_rupees(raw, int(price_rupees)))

                        db.add(
                            PriceHistory(
                                product_id=product.id,
                                price=hist_price,
                                recorded_at=rec_date,
                            )
                        )

                seeded_products.append(product)

            await db.commit()

            # Recalculate Value Scores
            print(f"Calculating Value Scores for {category.name}...")
            await ValueScoreCalculator.recalculate_category(db, category.id)

        # Seed Sample Reviews & Summaries
        print("Seeding Reviews & AI Summaries...")
        for product in seeded_products[:20]:
            rev = (await db.execute(select(Review).where(Review.product_id == product.id))).first()
            if not rev:
                review = Review(
                    product_id=product.id,
                    user_id=customer.id,
                    author_name=customer.name,
                    rating=int(round(float(product.rating_avg))) or 5,
                    title="Impressive value and solid build",
                    body=(
                        f"Been using the {product.name} daily. The build quality, "
                        "display clarity, and speed match the advertised specs perfectly."
                    ),
                    status="approved",
                )
                db.add(review)

            summ = (
                await db.execute(
                    select(ReviewSummary).where(ReviewSummary.product_id == product.id)
                )
            ).scalar_one_or_none()
            if not summ:
                summ = ReviewSummary(
                    product_id=product.id,
                    summary=(
                        f"The {product.name} delivers standout capability and everyday value, "
                        "making it an easy recommendation."
                    ),
                    pros=[
                        "Premium design and materials",
                        "Responsive performance for heavy tasks",
                        "Sharp and color-accurate display",
                    ],
                    cons=["Slightly warm under sustained maximum load", "Charger brick is bulky"],
                    sentiment="positive",
                    reviews_count=product.rating_count or 8,
                    generated_at=now,
                )
                db.add(summ)

        # Seed Wishlist for Customer
        for prod in seeded_products[:3]:
            existing_wl = (
                await db.execute(
                    select(WishlistItem).where(
                        WishlistItem.user_id == customer.id, WishlistItem.product_id == prod.id
                    )
                )
            ).first()
            if not existing_wl:
                db.add(WishlistItem(user_id=customer.id, product_id=prod.id))

        # Seed Comparison for Customer
        comp = (
            await db.execute(select(Comparison).where(Comparison.user_id == customer.id))
        ).scalar_one_or_none()
        if not comp and len(seeded_products) >= 3:
            comp = Comparison(
                user_id=customer.id,
                name="Top Laptop Contenders 2026",
                share_token=generate_share_token(32),
            )
            db.add(comp)
            await db.flush()
            for idx, p in enumerate(seeded_products[:3]):
                db.add(ComparisonItem(comparison_id=comp.id, product_id=p.id, position=idx + 1))

        await db.commit()
        print(
            "Database seed completed successfully! "
            "60 products seeded with specs, prices, and AI summaries."
        )


if __name__ == "__main__":
    asyncio.run(seed_all())
