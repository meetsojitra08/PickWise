import type { ProductSummary } from '@/features/catalog/types/catalog';
import type { CompareMatrixData } from '@/features/compare/types/compare';
import type { ApiPaginatedResponse, ApiSuccessResponse } from '@/types/api';

export interface SavedComparison {
  id: number;
  name: string;
  share_token: string | null;
  is_shared: boolean;
  item_count: number;
  unavailable_count: number;
  items: ProductSummary[];
  created_at: string | null;
  updated_at: string | null;
}

export interface SavedComparisonDetail extends SavedComparison {
  matrix: CompareMatrixData | null;
}

export interface SharedComparison {
  name: string;
  unavailable_count: number;
  matrix: CompareMatrixData | null;
}

export interface UpdateComparisonPayload {
  name?: string;
  product_ids?: number[];
}

export type ComparisonListResponse = ApiPaginatedResponse<SavedComparison>;
export type ComparisonResponse = ApiSuccessResponse<SavedComparisonDetail>;
export type SharedComparisonResponse = ApiSuccessResponse<SharedComparison>;
export type ShareTokenResponse = ApiSuccessResponse<{ share_token: string }>;
