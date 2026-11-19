from datetime import UTC, datetime
from typing import Any

from fastapi import Request
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AiUsageLog, Comparison
from app.schemas.assistant import CompareVerdictOut, CompareVerdictProductOut
from app.services.compare import CompareService
from app.services.groq_client import GroqClient
from app.services.quota import AiQuotaService


class VerdictService:
    @classmethod
    async def generate_verdict(
        cls,
        db: AsyncSession,
        redis: Redis,
        request: Request,
        product_ids: list[int],
        priority: str | None = None,
        comparison_id: int | None = None,
        user: Any | None = None,
    ) -> CompareVerdictOut:
        # Check quota first
        quota_snapshot = await AiQuotaService.consume(redis, request, user)

        # Build compare matrix
        matrix = await CompareService.build_compare_matrix(db, product_ids)

        # Fetch product names
        prod_cards = {p.id: p for p in matrix.products}

        # Attempt Groq verdict if configured
        groq_success = False
        verdict_text = ""
        verdict_products: list[CompareVerdictProductOut] = []

        if GroqClient.get_client() is not None:
            system_prompt = (
                "You are the Pickwise product comparison judge. "
                "Compare the products objectively based on specs and user priority.\n"
                "Return JSON only with this shape:\n"
                '{"verdict": "Comprehensive summary verdict in 2-3 sentences", '
                '"products": [{"product_id": 1, "name": "Product Name", '
                '"strengths": ["string"], "weaknesses": ["string"]}]}'
            )

            # Construct matrix prompt
            prompt_lines = [f"Comparing products in {matrix.category.name}:"]
            for p in matrix.products:
                prompt_lines.append(
                    f"- ID {p.id}: {p.name} ({p.price.amount} {p.price.currency}, "
                    f"rating: {p.rating_avg})"
                )
            if priority:
                prompt_lines.append(f"User priority: {priority}")
            prompt_lines.append("Key spec differences:")
            for r in matrix.rows:
                val_str = ", ".join(f"Prod {v.product_id}: {v.value}" for v in r.values)
                winner_str = f" (Winner: Prod {r.winner_product_id})" if r.winner_product_id else ""
                prompt_lines.append(f"- {r.label}: {val_str}{winner_str}")

            user_prompt = "\n".join(prompt_lines)

            try:
                parsed, p_tokens, c_tokens, lat_ms = await GroqClient.complete_json(
                    system_prompt, user_prompt
                )
                verdict_text = parsed.get("verdict", "")
                raw_prods = parsed.get("products", [])
                for rp in raw_prods:
                    pid = rp.get("product_id")
                    if pid in prod_cards:
                        verdict_products.append(
                            CompareVerdictProductOut(
                                product_id=pid,
                                name=prod_cards[pid].name,
                                strengths=rp.get("strengths", []),
                                weaknesses=rp.get("weaknesses", []),
                            )
                        )
                groq_success = True

                # Log usage
                usage_log = AiUsageLog(
                    user_id=user.id if user else None,
                    feature="compare",
                    model=None,
                    prompt_tokens=p_tokens,
                    completion_tokens=c_tokens,
                    latency_ms=lat_ms,
                    status="ok",
                    created_at=datetime.now(UTC).replace(tzinfo=None),
                )
                db.add(usage_log)
                await db.commit()
            except Exception:
                groq_success = False

        # Fallback deterministic verdict if Groq is not available or failed
        if not groq_success or not verdict_products:
            # Deterministic verdict logic
            strengths_by_id: dict[int, list[str]] = {pid: [] for pid in product_ids}
            weaknesses_by_id: dict[int, list[str]] = {pid: [] for pid in product_ids}

            for row in matrix.rows:
                if row.winner_product_id:
                    strengths_by_id[row.winner_product_id].append(
                        f"Best-in-class {row.label.lower()}"
                    )
                    for pid in product_ids:
                        if pid != row.winner_product_id:
                            weaknesses_by_id[pid].append(f"Lower {row.label.lower()} than winner")

            # Rating / Price comparison
            sorted_by_price = sorted(matrix.products, key=lambda p: float(p.price.amount))
            cheapest = sorted_by_price[0]
            strengths_by_id[cheapest.id].append(
                f"Most budget-friendly at {cheapest.price.amount} {cheapest.price.currency}"
            )

            sorted_by_rating = sorted(
                matrix.products, key=lambda p: float(p.rating_avg), reverse=True
            )
            top_rated = sorted_by_rating[0]
            strengths_by_id[top_rated.id].append(
                f"Highest shopper rating ({top_rated.rating_avg}/5)"
            )

            verdict_products = []
            for p in matrix.products:
                verdict_products.append(
                    CompareVerdictProductOut(
                        product_id=p.id,
                        name=p.name,
                        strengths=strengths_by_id[p.id][:3] or ["Solid general performance"],
                        weaknesses=weaknesses_by_id[p.id][:2] or ["Higher premium tier"],
                    )
                )

            verdict_text = (
                f"{top_rated.name} is the top-rated contender overall, while "
                f"{cheapest.name} delivers the strongest value-for-money in the "
                f"{matrix.category.name} category."
            )

        # Update comparison record if comparison_id is passed
        if comparison_id:
            comp_stmt = select(Comparison).where(Comparison.id == comparison_id)
            comp = (await db.execute(comp_stmt)).scalar_one_or_none()
            if comp:
                comp.ai_verdict = {
                    "verdict": verdict_text,
                    "products": [vp.dict() for vp in verdict_products],
                    "generated_at": datetime.now(UTC).isoformat(),
                }
                await db.commit()

        return CompareVerdictOut(
            verdict=verdict_text,
            products=verdict_products,
            quota=quota_snapshot,
            comparison_id=comparison_id,
        )
