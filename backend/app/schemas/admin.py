from typing import Any

from pydantic import BaseModel, Field


class AdminDashboardCounts(BaseModel):
    products: dict[str, int]
    users: dict[str, int]
    pending_reviews: int
    ai_calls_today: int


class AdminAiUsageSummary(BaseModel):
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    total_tokens: int = 0
    avg_latency_ms: float = 0.0


class AdminActivityItem(BaseModel):
    id: int
    admin: dict[str, Any] | None = None
    action: str
    subject_type: str | None = None
    subject_id: int | None = None
    changes: dict[str, Any] | None = None
    ip_address: str | None = None
    created_at: str


class AdminPendingReviewItem(BaseModel):
    id: int
    product: dict[str, Any] | None = None
    author_name: str
    rating: int
    title: str
    body: str
    created_at: str


class AdminDashboardData(BaseModel):
    counts: AdminDashboardCounts
    ai_usage_today: AdminAiUsageSummary
    recent_activity: list[AdminActivityItem] = []
    pending_reviews: list[AdminPendingReviewItem] = []


class AdminCategory(BaseModel):
    id: int
    parent_id: int | None = None
    parent: dict[str, Any] | None = None
    name: str
    slug: str
    description: str | None = None
    image_path: str | None = None
    image_url: str | None = None
    sort_order: int = 0
    is_active: bool = True
    products_count: int = 0
    spec_definitions_count: int = 0
    children_count: int = 0
    created_at: str | None = None
    updated_at: str | None = None


class AdminCategoryFormData(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str | None = None
    parent_id: int | None = None
    description: str | None = None
    sort_order: int = 0
    is_active: bool = True


class AdminSpecDefinition(BaseModel):
    id: int
    category_id: int
    key: str
    label: str
    unit: str | None = None
    data_type: str
    is_filterable: bool = False
    is_comparable: bool = False
    higher_is_better: bool | None = None
    sort_order: int = 0
    product_specs_count: int = 0
    created_at: str | None = None
    updated_at: str | None = None


class AdminSpecDefinitionFormData(BaseModel):
    key: str = Field(..., min_length=1, max_length=50)
    label: str = Field(..., min_length=1, max_length=100)
    unit: str | None = None
    data_type: str
    is_filterable: bool = False
    is_comparable: bool = False
    higher_is_better: bool | None = None
    sort_order: int = 0


class AdminBrand(BaseModel):
    id: int
    name: str
    slug: str
    logo_path: str | None = None
    logo_url: str | None = None
    products_count: int = 0
    created_at: str | None = None
    updated_at: str | None = None


class AdminBrandFormData(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str | None = None
    logo_path: str | None = None


class AdminProductImage(BaseModel):
    id: int
    url: str | None = None
    alt_text: str = ""
    sort_order: int = 0
    is_primary: bool = False


class AdminProductImageReorderPayload(BaseModel):
    image_ids: list[int]
    primary_id: int | None = None


class AdminProductImageUpdatePayload(BaseModel):
    alt_text: str | None = None
    is_primary: bool | None = None
    sort_order: int | None = None


class AdminProductSpec(BaseModel):
    id: int
    spec_definition_id: int
    key: str
    label: str
    unit: str | None = None
    data_type: str
    value: Any = None
    is_filterable: bool = False
    is_comparable: bool = False
    higher_is_better: bool | None = None


class AdminProduct(BaseModel):
    id: int
    category_id: int
    brand_id: int
    name: str
    slug: str
    summary: str | None = None
    description: str | None = None
    price: dict[str, Any]
    currency: str
    availability: str
    availability_label: str
    store_url: str | None = None
    rating_avg: float
    rating_count: int
    value_score: int | None = None
    is_published: bool
    is_deleted: bool = False
    category: dict[str, Any] | None = None
    brand: dict[str, Any] | None = None
    primary_image: dict[str, Any] | None = None
    images: list[AdminProductImage] = []
    specs: list[AdminProductSpec] = []
    price_history: list[dict[str, Any]] = []
    created_at: str | None = None
    updated_at: str | None = None
    deleted_at: str | None = None


class AdminProductFormData(BaseModel):
    category_id: int
    brand_id: int
    name: str = Field(..., min_length=1, max_length=150)
    slug: str | None = None
    summary: str
    description: str
    price: float = Field(..., ge=0)
    currency: str = "USD"
    availability: str = "in_stock"
    store_url: str | None = None
    is_published: bool = True
    specs: list[dict[str, Any]] | None = None


class AdminBulkStatusPayload(BaseModel):
    product_ids: list[int]
    is_published: bool


class AdminUser(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    reviews_count: int = 0
    preferences: dict[str, Any] | None = None
    created_at: str


class UpdateAdminUserPayload(BaseModel):
    is_active: bool | None = None
    role: str | None = None


class AdminReview(BaseModel):
    id: int
    product: dict[str, Any] | None = None
    user: dict[str, Any] | None = None
    author_name: str
    rating: int
    title: str
    body: str
    status: str
    moderator: dict[str, Any] | None = None
    moderated_by: int | None = None
    moderated_at: str | None = None
    created_at: str
    updated_at: str


class ModerateReviewPayload(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected)$")
    reason: str | None = None


class BulkModerateReviewsPayload(BaseModel):
    review_ids: list[int]
    status: str = Field(..., pattern="^(approved|rejected)$")
    reason: str | None = None


class BulkModerateReviewsResponse(BaseModel):
    count: int
    status: str


class RegenerateSummaryResponse(BaseModel):
    product_id: int
    queued: bool
    message: str


class AdminAiUsageDetailedSummary(BaseModel):
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    error_calls: int = 0
    rate_limited_calls: int = 0
    error_rate: float = 0.0
    total_tokens: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    avg_latency_ms: float = 0.0


class AdminAiFeatureBreakdown(BaseModel):
    feature: str
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    total_tokens: int = 0
    avg_latency_ms: float = 0.0


class AdminAiDailyUsagePoint(BaseModel):
    date: str
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    total_tokens: int = 0
    avg_latency_ms: float = 0.0
    by_feature: dict[str, int] = {}


class AdminAiTopUserItem(BaseModel):
    user_id: int
    name: str
    email: str
    total_calls: int = 0
    total_tokens: int = 0
    last_active_at: str | None = None


class AdminAiUsageLogItem(BaseModel):
    id: int
    user: dict[str, Any] | None = None
    feature: str
    model: str | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int = 0
    latency_ms: int | None = None
    status: str
    error_code: str | None = None
    created_at: str


class AdminAiUsagePagination(BaseModel):
    current_page: int
    last_page: int
    per_page: int
    total: int


class AdminAiUsageData(BaseModel):
    summary: AdminAiUsageDetailedSummary
    by_feature: list[AdminAiFeatureBreakdown] = []
    daily_usage: list[AdminAiDailyUsagePoint] = []
    top_users: list[AdminAiTopUserItem] = []
    guest_calls: int = 0
    logs: list[AdminAiUsageLogItem] = []
    pagination: AdminAiUsagePagination
    date_range: dict[str, str]
