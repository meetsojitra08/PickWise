from datetime import UTC, datetime, time, timedelta

from fastapi import Request
from redis.asyncio import Redis

from app.core.config import settings
from app.core.exceptions import AiQuotaExceededException
from app.models import User
from app.schemas.assistant import AiQuotaOut


class AiQuotaService:
    @classmethod
    def get_identity(cls, request: Request, user: User | None = None) -> str:
        if user:
            return f"user:{user.id}"
        session_key = request.headers.get("x-session-key")
        if session_key and session_key.strip():
            return f"session:{session_key.strip()}"
        client_ip = request.client.host if request.client else "unknown"
        return f"ip:{client_ip}"

    @classmethod
    def get_limit(cls, user: User | None = None) -> int:
        return settings.AI_DAILY_QUOTA_USER if user else settings.AI_DAILY_QUOTA_GUEST

    @classmethod
    def get_resets_at(cls) -> datetime:
        now = datetime.now(UTC)
        tomorrow = now.date() + timedelta(days=1)
        return datetime.combine(tomorrow, time.min, tzinfo=UTC)

    @classmethod
    def get_seconds_until_reset(cls) -> int:
        now = datetime.now(UTC)
        resets_at = cls.get_resets_at()
        return max(1, int((resets_at - now).total_seconds()))

    @classmethod
    def get_cache_key(cls, request: Request, user: User | None = None) -> str:
        identity = cls.get_identity(request, user)
        date_str = datetime.now(UTC).strftime("%Y-%m-%d")
        return f"pickwise:ai:quota:{identity}:{date_str}"

    @classmethod
    async def snapshot(
        cls,
        redis: Redis,
        request: Request,
        user: User | None = None,
    ) -> AiQuotaOut:
        key = cls.get_cache_key(request, user)
        limit = cls.get_limit(user)
        raw_val = await redis.get(key)
        used = int(raw_val) if raw_val is not None else 0
        remaining = max(0, limit - used)
        resets_at_str = cls.get_resets_at().strftime("%Y-%m-%dT%H:%M:%SZ")
        return AiQuotaOut(
            limit=limit,
            used=used,
            remaining=remaining,
            resets_at=resets_at_str,
        )

    @classmethod
    async def consume(
        cls,
        redis: Redis,
        request: Request,
        user: User | None = None,
    ) -> AiQuotaOut:
        key = cls.get_cache_key(request, user)
        limit = cls.get_limit(user)
        resets_at_str = cls.get_resets_at().strftime("%Y-%m-%dT%H:%M:%SZ")

        # Check existing
        raw_val = await redis.get(key)
        used = int(raw_val) if raw_val is not None else 0
        if used >= limit:
            raise AiQuotaExceededException(
                f"You have reached your daily AI limit ({limit} requests). "
                f"Resets at {resets_at_str}.",
                details={"limit": limit, "used": used, "resets_at": resets_at_str},
            )

        new_val = await redis.incr(key)
        if new_val == 1:
            await redis.expire(key, cls.get_seconds_until_reset())

        remaining = max(0, limit - new_val)
        return AiQuotaOut(
            limit=limit,
            used=new_val,
            remaining=remaining,
            resets_at=resets_at_str,
        )
