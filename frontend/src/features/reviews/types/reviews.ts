import type {
  ApiPaginatedResponse,
  ApiSuccessResponse,
  PaginationMeta,
} from '@/types/api';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: number;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  author_name: string;
  is_own: boolean;
  created_at: string | null;
}

export type RatingDistribution = Record<1 | 2 | 3 | 4 | 5, number>;

export interface ProductReviewsMeta extends PaginationMeta {
  rating_distribution: RatingDistribution;
  own_pending_review: Review | null;
  has_reviewed: boolean;
}

export interface ProductReviewsResponse extends Omit<
  ApiPaginatedResponse<Review>,
  'meta'
> {
  meta: ProductReviewsMeta;
}

export interface ReviewPayload {
  rating: number;
  title: string;
  body: string;
}

export type ReviewResponse = ApiSuccessResponse<Review>;
