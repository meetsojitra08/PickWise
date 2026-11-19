from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field
from app.schemas.catalog import ProductCardOut


class AiQuotaOut(BaseModel):
    limit: int
    used: int
    remaining: int
    resets_at: str


class AssistantRecommendationItemOut(BaseModel):
    product_id: int
    product: Optional[ProductCardOut] = None
    reason: Optional[str] = None
    tradeoffs: List[str] = []


class AssistantMessageOut(BaseModel):
    id: int
    role: str
    content: str
    recommendations: List[AssistantRecommendationItemOut] = []
    alternatives: List[AssistantRecommendationItemOut] = []
    status: str = "ok"
    created_at: Optional[str] = None


class AiConversationSummaryOut(BaseModel):
    id: int
    title: Optional[str] = None
    last_message_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    messages_count: Optional[int] = None


class AiConversationDetailOut(BaseModel):
    id: int
    title: Optional[str] = None
    last_message_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    messages: List[AssistantMessageOut] = []


class SendMessagePayload(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    category: Optional[str] = None
    budget_max: Optional[Union[float, int, str]] = None


class CreateConversationPayload(BaseModel):
    title: Optional[str] = None


class CompareVerdictProductOut(BaseModel):
    product_id: int
    name: str
    strengths: List[str] = []
    weaknesses: List[str] = []


class CompareVerdictOut(BaseModel):
    verdict: str
    products: List[CompareVerdictProductOut] = []
    quota: AiQuotaOut
    comparison_id: Optional[int] = None


class CompareVerdictPayload(BaseModel):
    product_ids: List[int] = Field(..., min_length=2, max_length=4)
    priority: Optional[str] = None
    comparison_id: Optional[int] = None
