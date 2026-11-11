import type { MoneyValue } from '@/types/api';

export type ProductAvailability = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface ProductCategoryRef {
  id: number;
  name: string;
  slug: string;
}

export interface ProductBrandRef {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
}

export interface ProductPrimaryImage {
  id: number;
  url: string | null;
  alt_text: string;
}

export interface ProductSummary {
  id: number;
  name: string;
  slug: string;
  summary: string;
  price: MoneyValue;
  availability: ProductAvailability;
  availability_label: string;
  rating_avg: number;
  rating_count: number;
  value_score: number | null;
  category?: ProductCategoryRef | null;
  brand?: ProductBrandRef | null;
  primary_image?: ProductPrimaryImage | null;
  created_at: string | null;
}
