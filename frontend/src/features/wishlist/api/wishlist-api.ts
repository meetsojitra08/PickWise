import { apiClient } from '@/lib/api-client';
import type {
  WishlistItemResponse,
  WishlistResponse,
} from '@/features/wishlist/types/wishlist';

export const WISHLIST_PER_PAGE = 48;

export function getWishlist(page: number, signal?: AbortSignal) {
  return apiClient.get<WishlistResponse>('/wishlist', {
    params: { page, per_page: WISHLIST_PER_PAGE },
    signal,
  });
}

export function addWishlistItem(productId: number) {
  return apiClient.post<WishlistItemResponse>('/wishlist', {
    product_id: productId,
  });
}

export function removeWishlistItem(productId: number) {
  return apiClient.delete<void>(`/wishlist/${encodeURIComponent(productId)}`);
}
