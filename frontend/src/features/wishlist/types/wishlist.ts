import type { ProductSummary } from '@/features/catalog/types/catalog';
import type { ApiPaginatedResponse, ApiSuccessResponse } from '@/types/api';

export interface WishlistItem {
  id: number;
  product: ProductSummary | null;
  created_at: string | null;
}

export type WishlistResponse = ApiPaginatedResponse<WishlistItem>;
export type WishlistItemResponse = ApiSuccessResponse<WishlistItem>;
