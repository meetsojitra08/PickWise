export interface AdminDashboardCounts {
  products: {
    total: number;
    published: number;
    unpublished: number;
  };
  users: {
    total: number;
    active: number;
    customers: number;
    admins: number;
  };
  pending_reviews: number;
  ai_calls_today: number;
}

export interface AdminAiUsageSummary {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  total_tokens: number;
  avg_latency_ms: number;
}

export interface AdminActivityItem {
  id: number;
  admin: {
    id: number;
    name: string;
    email: string;
  } | null;
  action: string;
  subject_type: string | null;
  subject_id: number | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AdminPendingReviewItem {
  id: number;
  product: {
    id: number;
    name: string;
    slug: string;
  } | null;
  author_name: string;
  rating: number;
  title: string;
  body: string;
  created_at: string;
}

export interface AdminDashboardData {
  counts: AdminDashboardCounts;
  ai_usage_today: AdminAiUsageSummary;
  recent_activity: AdminActivityItem[];
  pending_reviews: AdminPendingReviewItem[];
}
