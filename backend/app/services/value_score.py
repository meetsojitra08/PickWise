from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product
from app.models.spec_definition import ProductSpec


class ValueScoreCalculator:
    SPEC_WEIGHT = 0.40
    RATING_WEIGHT = 0.30
    PRICE_WEIGHT = 0.30
    RATING_PRIOR = 4.0
    RATING_PRIOR_COUNT = 5

    @classmethod
    async def recalculate_category(
        cls, db: AsyncSession, category_id: int
    ) -> dict[int, int | None]:
        stmt = (
            select(Product)
            .where(
                Product.category_id == category_id,
                Product.is_published.is_(True),
                Product.deleted_at.is_(None),
            )
            .options(selectinload(Product.specs).selectinload(ProductSpec.spec_definition))
            .order_by(Product.id)
        )
        result = await db.execute(stmt)
        products = list(result.scalars().all())

        if not products:
            return {}

        spec_values: dict[str, dict[int, float]] = {}
        directions_by_key: dict[str, bool] = {}

        for product in products:
            for spec in product.specs:
                defn = spec.spec_definition
                if (
                    not defn.is_comparable
                    or defn.data_type != "number"
                    or defn.higher_is_better is None
                    or spec.value_number is None
                ):
                    continue

                if defn.key not in spec_values:
                    spec_values[defn.key] = {}
                spec_values[defn.key][product.id] = float(spec.value_number)
                directions_by_key[defn.key] = defn.higher_is_better

        percentiles_by_product: dict[int, list[float]] = {}
        for defn_key, values_by_prod in spec_values.items():
            all_vals = list(values_by_prod.values())
            for prod_id, val in values_by_prod.items():
                pctl = cls.percentile(val, all_vals)
                score_contrib = pctl if directions_by_key[defn_key] else (1.0 - pctl)
                if prod_id not in percentiles_by_product:
                    percentiles_by_product[prod_id] = []
                percentiles_by_product[prod_id].append(score_contrib)

        strength_by_product: dict[int, float] = {}
        for prod_id, pctls in percentiles_by_product.items():
            strength_by_product[prod_id] = sum(pctls) / len(pctls)

        efficiencies: dict[int, float] = {}
        for product in products:
            strength = strength_by_product.get(product.id)
            price = float(product.price)
            if strength is not None and price > 0:
                efficiencies[product.id] = strength / price

        scores: dict[int, int | None] = {}
        all_efficiencies = list(efficiencies.values())

        for product in products:
            strength = strength_by_product.get(product.id)
            efficiency = efficiencies.get(product.id)

            if strength is None or efficiency is None or not all_efficiencies:
                score = None
            else:
                rating_conf = cls.rating_confidence(product)
                price_pctl = cls.percentile(efficiency, all_efficiencies)
                score = int(
                    round(
                        100.0
                        * (
                            cls.SPEC_WEIGHT * strength
                            + cls.RATING_WEIGHT * rating_conf
                            + cls.PRICE_WEIGHT * price_pctl
                        )
                    )
                )

            product.value_score = score
            scores[product.id] = score

        await db.commit()
        return scores

    @classmethod
    def rating_confidence(cls, product: Product) -> float:
        count = product.rating_count
        avg = float(product.rating_avg)
        adjusted = (avg * count + cls.RATING_PRIOR * cls.RATING_PRIOR_COUNT) / (
            count + cls.RATING_PRIOR_COUNT
        )
        return adjusted / 5.0

    @staticmethod
    def percentile(value: float, values: list[float]) -> float:
        count = len(values)
        if count <= 1:
            return 0.5

        less = sum(1 for v in values if v < value)
        equal = sum(1 for v in values if v == value)

        return (less + ((equal - 1) / 2.0)) / (count - 1)
