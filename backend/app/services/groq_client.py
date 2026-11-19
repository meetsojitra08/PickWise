import json
import time
from typing import Any

from groq import AsyncGroq

from app.core.config import settings
from app.core.exceptions import AppException


class AiUnavailableException(AppException):
    def __init__(
        self, message: str = "AI is currently unavailable", reason: str = "provider_error"
    ):
        super().__init__(
            code="ai_unavailable", message=message, status_code=503, details={"reason": reason}
        )


class GroqClient:
    _client: AsyncGroq | None = None

    @classmethod
    def get_client(cls) -> AsyncGroq | None:
        if not settings.GROQ_API_KEY:
            return None
        if cls._client is None:
            cls._client = AsyncGroq(
                api_key=settings.GROQ_API_KEY, timeout=float(settings.GROQ_TIMEOUT_SECONDS)
            )
        return cls._client

    @classmethod
    async def complete_json(
        cls,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
    ) -> tuple[dict[str, Any], int, int, int]:
        client = cls.get_client()
        if not client:
            raise AiUnavailableException("Groq API key not configured", reason="missing_key")

        m = model or settings.GROQ_MODEL
        t0 = time.perf_counter()
        try:
            response = await client.chat.completions.create(
                model=m,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=1024,
            )
            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            content_str = response.choices[0].message.content or "{}"
            parsed = json.loads(content_str)
            usage = response.usage
            prompt_tokens = usage.prompt_tokens if usage else 0
            completion_tokens = usage.completion_tokens if usage else 0
            return parsed, prompt_tokens, completion_tokens, elapsed_ms
        except Exception as e:
            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            raise AiUnavailableException(
                f"Groq API error: {str(e)}", reason="provider_error"
            ) from e
