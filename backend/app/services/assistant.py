from datetime import UTC, datetime
from typing import Any

from fastapi import Request
from redis.asyncio import Redis
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ForbiddenException, NotFoundException
from app.models import AiConversation, AiMessage, AiUsageLog, Category, Product, ProductSpec, User
from app.schemas.assistant import (
    AiConversationDetailOut,
    AiConversationSummaryOut,
    AssistantMessageOut,
    AssistantRecommendationItemOut,
    SendMessagePayload,
)
from app.services.groq_client import GroqClient
from app.services.quota import AiQuotaService
from app.services.search import to_product_card


class AssistantService:
    @classmethod
    def resolve_session_key(cls, request: Request) -> str:
        key = request.headers.get("x-session-key")
        if key and key.strip():
            return key.strip()
        client_ip = request.client.host if request.client else "unknown"
        return f"guest-{client_ip}"

    @classmethod
    async def list_conversations(
        cls,
        db: AsyncSession,
        user: User | None,
        session_key: str,
        page: int = 1,
        per_page: int = 20,
    ) -> tuple[list[AiConversationSummaryOut], int, int]:
        condition = (
            AiConversation.user_id == user.id if user else AiConversation.session_key == session_key
        )

        count_stmt = select(func.count(AiConversation.id)).where(condition)
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = (
            select(
                AiConversation,
                func.count(AiMessage.id).label("messages_count"),
            )
            .outerjoin(AiMessage, AiMessage.conversation_id == AiConversation.id)
            .where(condition)
            .group_by(AiConversation.id)
            .order_by(
                func.coalesce(
                    AiConversation.last_message_at,
                    AiConversation.updated_at,
                    AiConversation.created_at,
                ).desc(),
                AiConversation.id.desc(),
            )
        )
        offset = (page - 1) * per_page
        rows = list((await db.execute(stmt.offset(offset).limit(per_page))).all())

        summaries = [
            AiConversationSummaryOut(
                id=c.id,
                title=c.title,
                last_message_at=c.last_message_at.isoformat() if c.last_message_at else None,
                created_at=c.created_at.isoformat() if c.created_at else None,
                updated_at=c.updated_at.isoformat() if c.updated_at else None,
                messages_count=msg_count,
            )
            for c, msg_count in rows
        ]
        last_page = max(1, (total + per_page - 1) // per_page)
        return summaries, total, last_page

    @classmethod
    async def create_conversation(
        cls,
        db: AsyncSession,
        user: User | None,
        session_key: str,
        title: str | None = None,
    ) -> AiConversationDetailOut:
        conv = AiConversation(
            user_id=user.id if user else None,
            session_key=None if user else session_key,
            title=title.strip() if title and title.strip() else "New conversation",
        )
        db.add(conv)
        await db.commit()
        await db.refresh(conv)

        return AiConversationDetailOut(
            id=conv.id,
            title=conv.title,
            last_message_at=None,
            created_at=conv.created_at.isoformat() if conv.created_at else None,
            updated_at=conv.updated_at.isoformat() if conv.updated_at else None,
            messages=[],
        )

    @classmethod
    async def get_conversation(
        cls,
        db: AsyncSession,
        conversation_id: int,
        user: User | None,
        session_key: str,
    ) -> AiConversationDetailOut:
        stmt = (
            select(AiConversation)
            .where(AiConversation.id == conversation_id)
            .options(selectinload(AiConversation.messages))
        )
        conv = (await db.execute(stmt)).scalar_one_or_none()
        if not conv:
            raise NotFoundException(f"Conversation '{conversation_id}' not found.")

        # Check access
        if user and conv.user_id != user.id and user.role != "admin":
            raise ForbiddenException("You cannot access this conversation.")
        if not user and conv.session_key != session_key:
            raise ForbiddenException("You cannot access this conversation.")

        # Collect all product_ids from all messages
        all_product_ids: set[int] = set()
        for msg in conv.messages:
            payload = msg.payload or {}
            for item in payload.get("recommendations", []) + payload.get("alternatives", []):
                if isinstance(item, dict) and "product_id" in item:
                    all_product_ids.add(int(item["product_id"]))

        # Load products
        prod_map: dict[int, Any] = {}
        if all_product_ids:
            p_stmt = (
                select(Product)
                .where(Product.id.in_(all_product_ids))
                .options(
                    selectinload(Product.category),
                    selectinload(Product.brand),
                    selectinload(Product.images),
                )
            )
            prods = list((await db.execute(p_stmt)).scalars().all())
            prod_map = {p.id: to_product_card(p) for p in prods}

        messages_out: list[AssistantMessageOut] = []
        for msg in conv.messages:
            payload = msg.payload or {}
            recs_out: list[AssistantRecommendationItemOut] = []
            for r in payload.get("recommendations", []):
                pid = r.get("product_id")
                recs_out.append(
                    AssistantRecommendationItemOut(
                        product_id=pid,
                        product=prod_map.get(pid),
                        reason=r.get("reason"),
                        tradeoffs=r.get("tradeoffs", []),
                    )
                )

            alts_out: list[AssistantRecommendationItemOut] = []
            for a in payload.get("alternatives", []):
                pid = a.get("product_id")
                alts_out.append(
                    AssistantRecommendationItemOut(
                        product_id=pid,
                        product=prod_map.get(pid),
                        reason=a.get("reason"),
                        tradeoffs=a.get("tradeoffs", []),
                    )
                )

            messages_out.append(
                AssistantMessageOut(
                    id=msg.id,
                    role=msg.role,
                    content=msg.content,
                    recommendations=recs_out,
                    alternatives=alts_out,
                    status=msg.status,
                    created_at=msg.created_at.isoformat() if msg.created_at else None,
                )
            )

        return AiConversationDetailOut(
            id=conv.id,
            title=conv.title,
            last_message_at=conv.last_message_at.isoformat() if conv.last_message_at else None,
            created_at=conv.created_at.isoformat() if conv.created_at else None,
            updated_at=conv.updated_at.isoformat() if conv.updated_at else None,
            messages=messages_out,
        )

    @classmethod
    async def delete_conversation(
        cls,
        db: AsyncSession,
        conversation_id: int,
        user: User | None,
        session_key: str,
    ) -> None:
        stmt = select(AiConversation).where(AiConversation.id == conversation_id)
        conv = (await db.execute(stmt)).scalar_one_or_none()
        if not conv:
            raise NotFoundException(f"Conversation '{conversation_id}' not found.")

        if user and conv.user_id != user.id and user.role != "admin":
            raise ForbiddenException("You cannot delete this conversation.")
        if not user and conv.session_key != session_key:
            raise ForbiddenException("You cannot delete this conversation.")

        await db.delete(conv)
        await db.commit()

    @classmethod
    async def send_message(
        cls,
        db: AsyncSession,
        redis: Redis,
        conversation_id: int,
        user: User | None,
        session_key: str,
        payload: SendMessagePayload,
        request: Request,
    ) -> AssistantMessageOut:
        stmt = select(AiConversation).where(AiConversation.id == conversation_id)
        conv = (await db.execute(stmt)).scalar_one_or_none()
        if not conv:
            raise NotFoundException(f"Conversation '{conversation_id}' not found.")

        if user and conv.user_id != user.id and user.role != "admin":
            raise ForbiddenException("You cannot access this conversation.")
        if not user and conv.session_key != session_key:
            raise ForbiddenException("You cannot access this conversation.")

        # Check and consume AI quota
        await AiQuotaService.consume(redis, request, user)

        # 1. Record user message
        user_msg = AiMessage(
            conversation_id=conv.id,
            role="user",
            content=payload.message,
            payload={},
            status="ok",
        )
        db.add(user_msg)
        await db.flush()

        # Update conversation title if first user message
        if conv.title == "New conversation":
            conv.title = payload.message[:60].strip()

        # 2. Retrieve grounded candidates
        budget_val: float | None = None
        if payload.budget_max is not None and str(payload.budget_max).strip():
            try:
                budget_val = float(str(payload.budget_max).strip())
            except ValueError:
                budget_val = None

        candidate_stmt = (
            select(Product)
            .where(Product.is_published.is_(True), Product.deleted_at.is_(None))
            .options(
                selectinload(Product.category),
                selectinload(Product.brand),
                selectinload(Product.images),
                selectinload(Product.specs).selectinload(ProductSpec.spec_definition),
            )
        )

        if payload.category:
            cat_stmt = select(Category.id).where(Category.slug == payload.category)
            cat_id = (await db.execute(cat_stmt)).scalar_one_or_none()
            if cat_id:
                candidate_stmt = candidate_stmt.where(Product.category_id == cat_id)

        if budget_val is not None:
            candidate_stmt = candidate_stmt.where(Product.price <= budget_val)

        candidate_stmt = candidate_stmt.order_by(
            Product.value_score.desc().nullslast(),
            Product.rating_avg.desc(),
        ).limit(6)

        candidates = list((await db.execute(candidate_stmt)).scalars().all())

        # If no candidates under budget, look for alternatives within +15%
        alternatives: list[Product] = []
        if not candidates and budget_val is not None:
            alt_stmt = (
                select(Product)
                .where(
                    Product.is_published.is_(True),
                    Product.deleted_at.is_(None),
                    Product.price > budget_val,
                    Product.price <= budget_val * 1.15,
                )
                .options(
                    selectinload(Product.category),
                    selectinload(Product.brand),
                    selectinload(Product.images),
                )
                .order_by(Product.price.asc())
                .limit(3)
            )
            alternatives = list((await db.execute(alt_stmt)).scalars().all())

        # 3. AI call or fallback
        assistant_content = ""
        recommendations_data: list[dict[str, Any]] = []
        alternatives_data: list[dict[str, Any]] = []
        status_val = "ok"

        if not candidates:
            if alternatives:
                assistant_content = (
                    "Nothing fits your budget exactly. These options are up to 15% over budget, "
                    "but worth a look."
                )
                alternatives_data = [
                    {"product_id": a.id, "reason": None, "tradeoffs": []} for a in alternatives
                ]
            else:
                assistant_content = (
                    "No products match those filters yet. Try a higher budget, a different "
                    "category, or a broader request."
                )
        else:
            # Candidates exist: try Groq if configured
            groq_success = False
            candidate_map = {c.id: c for c in candidates}

            if GroqClient.get_client() is not None:
                system_prompt = (
                    "You are the Pickwise shopping assistant. You help shoppers choose a product "
                    "from the candidate list supplied with each request.\n\n"
                    "Rules:\n"
                    "- Only recommend products from the candidate list, using their exact "
                    "product_id. Never invent a product, price, or specification.\n"
                    "- Recommend at most 3 products. Use an empty recommendations array when no "
                    "candidate fits.\n"
                    "- Reply with JSON only, using exactly this shape:\n"
                    '{"message":"1 to 3 short sentences","recommendations":['
                    '{"product_id":14,"reason":"why it fits","tradeoffs":["one drawback"]}]}'
                )

                prompt_lines = [
                    f"Shopper message: {payload.message}",
                    f"Category: {payload.category or 'any'}",
                    f"Budget maximum: {budget_val or 'not set'}",
                    "\nCandidate products:",
                ]
                for c in candidates:
                    prompt_lines.append(
                        f"- ID {c.id}: {c.name} | Price: {c.price} {c.currency} | "
                        f"Rating: {c.rating_avg}/5 | Summary: {c.summary}"
                    )

                user_prompt = "\n".join(prompt_lines)

                try:
                    parsed, p_tokens, c_tokens, lat_ms = await GroqClient.complete_json(
                        system_prompt, user_prompt
                    )
                    assistant_content = parsed.get(
                        "message", "Here are the top recommendations matching your request."
                    )
                    raw_recs = parsed.get("recommendations", [])
                    for r in raw_recs:
                        pid = r.get("product_id")
                        # Anti-hallucination guard: must exist in candidate list
                        if pid in candidate_map:
                            recommendations_data.append(
                                {
                                    "product_id": pid,
                                    "reason": r.get("reason"),
                                    "tradeoffs": r.get("tradeoffs", []),
                                }
                            )

                    if recommendations_data:
                        groq_success = True

                    # Log AI usage
                    usage_log = AiUsageLog(
                        user_id=user.id if user else None,
                        feature="assistant",
                        model=None,
                        prompt_tokens=p_tokens,
                        completion_tokens=c_tokens,
                        latency_ms=lat_ms,
                        status="ok",
                        created_at=datetime.now(UTC).replace(tzinfo=None),
                    )
                    db.add(usage_log)
                except Exception:
                    groq_success = False

            if not groq_success:
                status_val = "fallback" if GroqClient.get_client() is not None else "ok"
                assistant_content = "Here are the best matching products from the catalog."
                recommendations_data = [
                    {
                        "product_id": c.id,
                        "reason": f"Top pick with {c.rating_avg} rating and high value score.",
                        "tradeoffs": [],
                    }
                    for c in candidates[:3]
                ]

        # 4. Save assistant message
        asst_msg = AiMessage(
            conversation_id=conv.id,
            role="assistant",
            content=assistant_content,
            payload={
                "recommendations": recommendations_data,
                "alternatives": alternatives_data,
            },
            status=status_val,
        )
        db.add(asst_msg)
        conv.last_message_at = datetime.now(UTC).replace(tzinfo=None)
        await db.commit()
        await db.refresh(asst_msg)

        # Build response item
        all_ids = [r["product_id"] for r in recommendations_data] + [
            a["product_id"] for a in alternatives_data
        ]
        prod_map = {}
        if all_ids:
            p_stmt = (
                select(Product)
                .where(Product.id.in_(all_ids))
                .options(
                    selectinload(Product.category),
                    selectinload(Product.brand),
                    selectinload(Product.images),
                )
            )
            prods = list((await db.execute(p_stmt)).scalars().all())
            prod_map = {p.id: to_product_card(p) for p in prods}

        recs_out = [
            AssistantRecommendationItemOut(
                product_id=r["product_id"],
                product=prod_map.get(r["product_id"]),
                reason=r.get("reason"),
                tradeoffs=r.get("tradeoffs", []),
            )
            for r in recommendations_data
        ]
        alts_out = [
            AssistantRecommendationItemOut(
                product_id=a["product_id"],
                product=prod_map.get(a["product_id"]),
                reason=a.get("reason"),
                tradeoffs=a.get("tradeoffs", []),
            )
            for a in alternatives_data
        ]

        return AssistantMessageOut(
            id=asst_msg.id,
            role=asst_msg.role,
            content=asst_msg.content,
            recommendations=recs_out,
            alternatives=alts_out,
            status=asst_msg.status,
            created_at=asst_msg.created_at.isoformat() if asst_msg.created_at else None,
        )
