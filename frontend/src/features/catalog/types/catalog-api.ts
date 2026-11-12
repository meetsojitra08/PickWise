import type {
  ApiPaginatedResponse,
  ApiSuccessResponse,
  MoneyValue,
} from '@/types/api';
import type { ProductSummary } from '@/features/catalog/types/catalog';

export interface CatalogCategory {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  products_count?: number;
  children?: CatalogCategory[];
}

export interface CatalogFacetOption {
  value: string | boolean;
  label: string;
  products_count: number;
}

export interface CatalogSpecFacet {
  key: string;
  label: string;
  unit: string | null;
  data_type: 'number' | 'text' | 'boolean';
  range?: { min: number | null; max: number | null };
  options?: CatalogFacetOption[];
}

export interface CatalogFacets {
  category: CatalogCategory;
  price_range: { min: MoneyValue | null; max: MoneyValue | null };
  brands: Array<{
    id: number;
    name: string;
    slug: string;
    products_count: number;
  }>;
  availability: Array<{ value: string; label: string; products_count: number }>;
  specs: CatalogSpecFacet[];
}

export type CatalogProductsResponse = ApiPaginatedResponse<ProductSummary>;
export type SimilarProductsResponse = ApiSuccessResponse<ProductSummary[]>;
export type CatalogCategoriesResponse = ApiSuccessResponse<CatalogCategory[]>;
export type CatalogFacetsResponse = ApiSuccessResponse<CatalogFacets>;

export interface ProductDetailImage {
  id: number;
  url: string | null;
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
}

export interface ProductDetailSpec {
  key: string;
  label: string;
  unit: string | null;
  data_type: 'number' | 'text' | 'boolean';
  value: string | number | boolean | null;
  is_comparable: boolean;
  higher_is_better: boolean | null;
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  store_url: string | null;
  images: ProductDetailImage[];
  specs: ProductDetailSpec[];
}

export type ProductDetailResponse = ApiSuccessResponse<ProductDetail>;

export interface ProductPriceHistoryPoint {
  recorded_at: string;
  price: MoneyValue;
}

export interface ProductPriceHistory {
  currency: string;
  points: ProductPriceHistoryPoint[];
}

export type ProductPriceHistoryResponse =
  ApiSuccessResponse<ProductPriceHistory>;
