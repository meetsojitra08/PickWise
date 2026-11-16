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

export interface AdminProductImage {
  id: number;
  url: string | null;
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
}

export interface AdminProductImageReorderPayload {
  image_ids: number[];
  primary_id?: number | null;
}

export interface AdminProductImageUpdatePayload {
  alt_text?: string;
  is_primary?: boolean;
  sort_order?: number;
}

export interface AdminProductSpec {
  id: number;
  spec_definition_id: number;
  key: string;
  label: string;
  unit: string | null;
  data_type: SpecDataType;
  value: string | number | boolean | null;
  is_filterable: boolean;
  is_comparable: boolean;
  higher_is_better: boolean | null;
}

export interface AdminProduct {
  id: number;
  category_id: number;
  brand_id: number;
  name: string;
  slug: string;
  summary: string | null;
  description: string | null;
  price: {
    amount: string;
    currency: string;
    formatted: string;
  };
  currency: string;
  availability: 'in_stock' | 'out_of_stock' | 'preorder' | 'discontinued';
  availability_label: string;
  store_url: string | null;
  rating_avg: number;
  rating_count: number;
  value_score: number | null;
  is_published: boolean;
  is_deleted: boolean;
  category?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  brand?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  primary_image?: {
    id: number;
    url: string | null;
    alt_text: string;
  } | null;
  images?: AdminProductImage[];
  specs?: AdminProductSpec[];
  price_history?: Array<{
    id: number;
    recorded_at: string;
    price: {
      amount: string;
      currency: string;
      formatted: string;
    };
  }>;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface AdminBrand {
  id: number;
  name: string;
  slug: string;
  logo_path: string | null;
  logo_url: string | null;
  products_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminProductFormData {
  category_id: number;
  brand_id: number;
  name: string;
  slug?: string;
  summary: string;
  description: string;
  price: string | number;
  currency?: string;
  availability: 'in_stock' | 'out_of_stock' | 'preorder' | 'discontinued';
  store_url?: string;
  is_published: boolean;
  specs?: Array<{
    spec_definition_id: number;
    value: string | number | boolean;
  }>;
}

export interface AdminProductFilters {
  search?: string;
  category_id?: number;
  brand_id?: number;
  is_published?: boolean;
  availability?: string;
  trashed?: 'with' | 'only';
  sort?: string;
  page?: number;
  per_page?: number;
}

export interface AdminBrandFilters {
  search?: string;
  sort?: string;
  page?: number;
  per_page?: number;
}

export interface AdminBulkStatusPayload {
  product_ids: number[];
  is_published: boolean;
}
