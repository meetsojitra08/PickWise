from pydantic import BaseModel, Field

from app.schemas.catalog import ProductCardOut


class AiQuotaOut(BaseModel):
    limit: int
    used: int
    remaining: int
    resets_at: str


class AssistantRecommendationItemOut(BaseModel):
    product_id: int
    product: ProductCardOut | None = None
    reason: str | None = None
    tradeoffs: list[str] = []


class AssistantMessageOut(BaseModel):
    id: int
    role: str
    content: str
    recommendations: list[AssistantRecommendationItemOut] = []
    alternatives: list[AssistantRecommendationItemOut] = []
    status: str = "ok"
    created_at: str | None = None


class AiConversationSummaryOut(BaseModel):
    id: int
    title: str | None = None
    last_message_at: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    messages_count: int | None = None


class AiConversationDetailOut(BaseModel):
    id: int
    title: str | None = None
    last_message_at: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    messages: list[AssistantMessageOut] = []


class SendMessagePayload(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    category: str | None = None
    budget_max: float | int | str | None = None


class CreateConversationPayload(BaseModel):
    title: str | None = None


class CompareVerdictProductOut(BaseModel):
    product_id: int
    name: str
    strengths: list[str] = []
    weaknesses: list[str] = []


class CompareVerdictOut(BaseModel):
    verdict: str
    products: list[CompareVerdictProductOut] = []
    quota: AiQuotaOut
    comparison_id: int | None = None


class CompareVerdictPayload(BaseModel):
    product_ids: list[int] = Field(..., min_length=2, max_length=4)
    priority: str | None = None
    comparison_id: int | None = None
