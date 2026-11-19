from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ForbiddenException, NotFoundException, ValidationException
from app.models import Product, Review, User
from app.schemas.reviews import (
    ProductReviewsMeta,
    ProductReviewsResponse,
    ReviewOut,
    ReviewPayload,
)


class ReviewService:
    @classmethod
    async def recalculate_rating(cls, db: AsyncSession, product_id: int) -> None:
        agg_stmt = select(
            func.count(Review.id).label("rating_count"),
            func.coalesce(func.avg(Review.rating), 0).label("rating_avg"),
        ).where(Review.product_id == product_id, Review.status == "approved")
        agg_res = (await db.execute(agg_stmt)).one()
        prod_stmt = select(Product).where(Product.id == product_id)
        product = (await db.execute(prod_stmt)).scalar_one_or_none()
        if product:
            product.rating_count = int(agg_res.rating_count or 0)
            product.rating_avg = round(float(agg_res.rating_avg or 0), 2)
            await db.flush()

    @classmethod
    async def get_product_reviews(
        cls,
        db: AsyncSession,
        slug: str,
        page: int = 1,
        per_page: int = 10,
        current_user: User | None = None,
    ) -> ProductReviewsResponse:
        prod_stmt = select(Product).where(
            Product.slug == slug, Product.is_published.is_(True), Product.deleted_at.is_(None)
        )
        product = (await db.execute(prod_stmt)).scalar_one_or_none()
        if not product:
            raise NotFoundException(f"Product '{slug}' not found.")

        # Rating distribution from approved reviews
        dist_stmt = (
            select(Review.rating, func.count(Review.id))
            .where(Review.product_id == product.id, Review.status == "approved")
            .group_by(Review.rating)
        )
        dist_res = await db.execute(dist_stmt)
        dist_map = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        total = 0
        for r_val, r_count in dist_res.all():
            if r_val in dist_map:
                dist_map[r_val] = r_count
                total += r_count

        # Query approved reviews
        stmt = (
            select(Review)
            .where(Review.product_id == product.id, Review.status == "approved")
            .options(selectinload(Review.user))
            .order_by(Review.created_at.desc(), Review.id.desc())
        )
        offset = (page - 1) * per_page
        paginated_stmt = stmt.offset(offset).limit(per_page)
        reviews = list((await db.execute(paginated_stmt)).scalars().all())

        last_page = max(1, (total + per_page - 1) // per_page)

        # Check own review / pending review
        has_reviewed = False
        own_pending_out = None
        if current_user:
            check_reviewed = select(func.count(Review.id)).where(
                Review.product_id == product.id,
                Review.user_id == current_user.id,
            )
            has_reviewed = bool((await db.execute(check_reviewed)).scalar() or 0)

            pending_stmt = (
                select(Review)
                .where(
                    Review.product_id == product.id,
                    Review.user_id == current_user.id,
                    Review.status == "pending",
                )
                .options(selectinload(Review.user))
                .order_by(Review.created_at.desc())
                .limit(1)
            )
            pending_rev = (await db.execute(pending_stmt)).scalar_one_or_none()
            if pending_rev:
                own_pending_out = ReviewOut(
                    id=pending_rev.id,
                    rating=pending_rev.rating,
                    title=pending_rev.title,
                    body=pending_rev.body,
                    status=pending_rev.status,
                    author_name=pending_rev.user.name
                    if pending_rev.user
                    else (pending_rev.author_name or "Customer"),
                    is_own=True,
                    created_at=pending_rev.created_at.isoformat()
                    if pending_rev.created_at
                    else None,
                )

        review_outs = [
            ReviewOut(
                id=r.id,
                rating=r.rating,
                title=r.title,
                body=r.body,
                status=r.status,
                author_name=r.user.name if r.user else (r.author_name or "Customer"),
                is_own=(current_user is not None and r.user_id == current_user.id),
                created_at=r.created_at.isoformat() if r.created_at else None,
            )
            for r in reviews
        ]

        meta = ProductReviewsMeta(
            current_page=page,
            per_page=per_page,
            total=total,
            last_page=last_page,
            rating_distribution=dist_map,
            own_pending_review=own_pending_out,
            has_reviewed=has_reviewed,
        )

        return ProductReviewsResponse(data=review_outs, meta=meta)

    @classmethod
    async def create_review(
        cls,
        db: AsyncSession,
        slug: str,
        user: User,
        payload: ReviewPayload,
    ) -> ReviewOut:
        prod_stmt = select(Product).where(
            Product.slug == slug, Product.is_published.is_(True), Product.deleted_at.is_(None)
        )
        product = (await db.execute(prod_stmt)).scalar_one_or_none()
        if not product:
            raise NotFoundException(f"Product '{slug}' not found.")

        # Check existing review
        existing = await db.execute(
            select(Review.id).where(Review.product_id == product.id, Review.user_id == user.id)
        )
        if existing.scalar_one_or_none() is not None:
            raise ValidationException(
                "You have already reviewed this product.",
                details={"review": ["You have already reviewed this product."]},
            )

        review = Review(
            product_id=product.id,
            user_id=user.id,
            rating=payload.rating,
            title=payload.title,
            body=payload.body,
            status="pending",
        )
        db.add(review)
        await db.commit()
        await db.refresh(review)

        return ReviewOut(
            id=review.id,
            rating=review.rating,
            title=review.title,
            body=review.body,
            status=review.status,
            author_name=user.name,
            is_own=True,
            created_at=review.created_at.isoformat() if review.created_at else None,
        )

    @classmethod
    async def update_review(
        cls,
        db: AsyncSession,
        review_id: int,
        user: User,
        payload: ReviewPayload,
    ) -> ReviewOut:
        stmt = select(Review).where(Review.id == review_id).options(selectinload(Review.user))
        review = (await db.execute(stmt)).scalar_one_or_none()
        if not review:
            raise NotFoundException(f"Review '{review_id}' not found.")

        if review.user_id != user.id and user.role != "admin":
            raise ForbiddenException("You cannot edit this review.")

        was_approved = review.status == "approved"
        review.rating = payload.rating
        review.title = payload.title
        review.body = payload.body
        review.status = "pending"

        if was_approved:
            await cls.recalculate_rating(db, review.product_id)

        await db.commit()
        await db.refresh(review)

        return ReviewOut(
            id=review.id,
            rating=review.rating,
            title=review.title,
            body=review.body,
            status=review.status,
            author_name=review.user.name if review.user else (review.author_name or "Customer"),
            is_own=True,
            created_at=review.created_at.isoformat() if review.created_at else None,
        )

    @classmethod
    async def delete_review(cls, db: AsyncSession, review_id: int, user: User) -> None:
        stmt = select(Review).where(Review.id == review_id)
        review = (await db.execute(stmt)).scalar_one_or_none()
        if not review:
            raise NotFoundException(f"Review '{review_id}' not found.")

        if review.user_id != user.id and user.role != "admin":
            raise ForbiddenException("You cannot delete this review.")

        was_approved = review.status == "approved"
        product_id = review.product_id
        await db.delete(review)

        if was_approved:
            await cls.recalculate_rating(db, product_id)

        await db.commit()
