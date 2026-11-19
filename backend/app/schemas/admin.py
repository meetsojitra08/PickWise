from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AdminDashboardCounts(BaseModel):
    products: Dict[str, int]
    users: Dict[str, int]
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
    admin: Optional[Dict[str, Any]] = None
    action: str
    subject_type: Optional[str] = None
    subject_id: Optional[int] = None
    changes: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: str


class AdminPendingReviewItem(BaseModel):
    id: int
    product: Optional[Dict[str, Any]] = None
    author_name: str
    rating: int
    title: str
    body: str
    created_at: str


class AdminDashboardData(BaseModel):
    counts: AdminDashboardCounts
    ai_usage_today: AdminAiUsageSummary
    recent_activity: List[AdminActivityItem] = []
    pending_reviews: List[AdminPendingReviewItem] = []


class AdminCategory(BaseModel):
    id: int
    parent_id: Optional[int] = None
    parent: Optional[Dict[str, Any]] = None
    name: str
    slug: str
    description: Optional[str] = None
    image_path: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True
    products_count: int = 0
    spec_definitions_count: int = 0
    children_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AdminCategoryFormData(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: Optional[str] = None
    parent_id: Optional[int] = None
    description: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class AdminSpecDefinition(BaseModel):
    id: int
    category_id: int
    key: str
    label: str
    unit: Optional[str] = None
    data_type: str
    is_filterable: bool = False
    is_comparable: bool = False
    higher_is_better: Optional[bool] = None
    sort_order: int = 0
    product_specs_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AdminSpecDefinitionFormData(BaseModel):
    key: str = Field(..., min_length=1, max_length=50)
    label: str = Field(..., min_length=1, max_length=100)
    unit: Optional[str] = None
    data_type: str
    is_filterable: bool = False
    is_comparable: bool = False
    higher_is_better: Optional[bool] = None
    sort_order: int = 0


class AdminBrand(BaseModel):
    id: int
    name: str
    slug: str
    logo_path: Optional[str] = None
    logo_url: Optional[str] = None
    products_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AdminBrandFormData(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: Optional[str] = None
    logo_path: Optional[str] = None


class AdminProductImage(BaseModel):
    id: int
    url: Optional[str] = None
    alt_text: str = ""
    sort_order: int = 0
    is_primary: bool = False


class AdminProductImageReorderPayload(BaseModel):
    image_ids: List[int]
    primary_id: Optional[int] = None


class AdminProductImageUpdatePayload(BaseModel):
    alt_text: Optional[str] = None
    is_primary: Optional[bool] = None
    sort_order: Optional[int] = None


class AdminProductSpec(BaseModel):
    id: int
    spec_definition_id: int
    key: str
    label: str
    unit: Optional[str] = None
    data_type: str
    value: Any = None
    is_filterable: bool = False
    is_comparable: bool = False
    higher_is_better: Optional[bool] = None


class AdminProduct(BaseModel):
    id: int
    category_id: int
    brand_id: int
    name: str
    slug: str
    summary: Optional[str] = None
    description: Optional[str] = None
    price: Dict[str, Any]
    currency: str
    availability: str
    availability_label: str
    store_url: Optional[str] = None
    rating_avg: float
    rating_count: int
    value_score: Optional[int] = None
    is_published: bool
    is_deleted: bool = False
    category: Optional[Dict[str, Any]] = None
    brand: Optional[Dict[str, Any]] = None
    primary_image: Optional[Dict[str, Any]] = None
    images: List[AdminProductImage] = []
    specs: List[AdminProductSpec] = []
    price_history: List[Dict[str, Any]] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    deleted_at: Optional[str] = None


class AdminProductFormData(BaseModel):
    category_id: int
    brand_id: int
    name: str = Field(..., min_length=1, max_length=150)
    slug: Optional[str] = None
    summary: str
    description: str
    price: float = Field(..., ge=0)
    currency: str = "USD"
    availability: str = "in_stock"
    store_url: Optional[str] = None
    is_published: bool = True
    specs: Optional[List[Dict[str, Any]]] = None


class AdminBulkStatusPayload(BaseModel):
    product_ids: List[int]
    is_published: bool


class AdminUser(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    reviews_count: int = 0
    preferences: Optional[Dict[str, Any]] = None
    created_at: str


class UpdateAdminUserPayload(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None


class AdminReview(BaseModel):
    id: int
    product: Optional[Dict[str, Any]] = None
    user: Optional[Dict[str, Any]] = None
    author_name: str
    rating: int
    title: str
    body: str
    status: str
    moderator: Optional[Dict[str, Any]] = None
    moderated_by: Optional[int] = None
    moderated_at: Optional[str] = None
    created_at: str
    updated_at: str


class ModerateReviewPayload(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected)$")
    reason: Optional[str] = None


class BulkModerateReviewsPayload(BaseModel):
    review_ids: List[int]
    status: str = Field(..., pattern="^(approved|rejected)$")
    reason: Optional[str] = None


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
    by_feature: Dict[str, int] = {}


class AdminAiTopUserItem(BaseModel):
    user_id: int
    name: str
    email: str
    total_calls: int = 0
    total_tokens: int = 0
    last_active_at: Optional[str] = None


class AdminAiUsageLogItem(BaseModel):
    id: int
    user: Optional[Dict[str, Any]] = None
    feature: str
    model: Optional[str] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: int = 0
    latency_ms: Optional[int] = None
    status: str
    error_code: Optional[str] = None
    created_at: str


class AdminAiUsagePagination(BaseModel):
    current_page: int
    last_page: int
    per_page: int
    total: int


class AdminAiUsageData(BaseModel):
    summary: AdminAiUsageDetailedSummary
    by_feature: List[AdminAiFeatureBreakdown] = []
    daily_usage: List[AdminAiDailyUsagePoint] = []
    top_users: List[AdminAiTopUserItem] = []
    guest_calls: int = 0
    logs: List[AdminAiUsageLogItem] = []
    pagination: AdminAiUsagePagination
    date_range: Dict[str, str]
