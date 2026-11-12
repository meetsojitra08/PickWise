import { apiClient } from '@/lib/api-client';
import type {
  ProductReviewsResponse,
  ReviewPayload,
  ReviewResponse,
} from '@/features/reviews/types/reviews';

export const REVIEWS_PER_PAGE = 10;

export function getProductReviews(
  slug: string,
  page: number,
  signal?: AbortSignal,
) {
  return apiClient.get<ProductReviewsResponse>(
    `/products/${encodeURIComponent(slug)}/reviews`,
    {
      params: { page, per_page: REVIEWS_PER_PAGE },
      signal,
    },
  );
}

export function createProductReview(slug: string, payload: ReviewPayload) {
  return apiClient.post<ReviewResponse>(
    `/products/${encodeURIComponent(slug)}/reviews`,
    payload,
  );
}

export function updateReview(reviewId: number, payload: ReviewPayload) {
  return apiClient.patch<ReviewResponse>(`/reviews/${reviewId}`, payload);
}

export function deleteReview(reviewId: number) {
  return apiClient.delete<void>(`/reviews/${reviewId}`);
}
