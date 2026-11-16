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

export interface AdminCategory {
  id: number;
  parent_id: number | null;
  parent: {
    id: number;
    name: string;
    slug: string;
  } | null;
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  products_count: number;
  spec_definitions_count: number;
  children_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminCategoryFormData {
  name: string;
  slug?: string;
  parent_id: number | null;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

export type SpecDataType = 'number' | 'text' | 'boolean';

export interface AdminSpecDefinition {
  id: number;
  category_id: number;
  key: string;
  label: string;
  unit: string | null;
  data_type: SpecDataType;
  is_filterable: boolean;
  is_comparable: boolean;
  higher_is_better: boolean | null;
  sort_order: number;
  product_specs_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminSpecDefinitionFormData {
  key: string;
  label: string;
  unit?: string | null;
  data_type: SpecDataType;
  is_filterable: boolean;
  is_comparable: boolean;
  higher_is_better?: boolean | null;
  sort_order: number;
}
