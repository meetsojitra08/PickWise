import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { catalogKeys } from '@/features/catalog/hooks/use-catalog-data';
import {
  createProductReview,
  deleteReview,
  getProductReviews,
  updateReview,
} from '@/features/reviews/api/reviews-api';
import type { ReviewPayload } from '@/features/reviews/types/reviews';

export const reviewKeys = {
  all: ['reviews'] as const,
  product: (slug: string) => [...reviewKeys.all, 'product', slug] as const,
  page: (slug: string, page: number) =>
    [...reviewKeys.product(slug), page] as const,
};

function invalidateProductReviews(queryClient: QueryClient, slug: string) {
  void queryClient.invalidateQueries({ queryKey: reviewKeys.product(slug) });
  // Rating aggregates on the product detail/cards come from approved reviews.
  void queryClient.invalidateQueries({ queryKey: catalogKeys.product(slug) });
}

export function useProductReviews(slug: string, page: number) {
  return useQuery({
    queryKey: reviewKeys.page(slug, page),
    queryFn: ({ signal }) => getProductReviews(slug, page, signal),
    enabled: slug !== '',
    placeholderData: (previous) => previous,
  });
}

export function useCreateReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, payload }: { slug: string; payload: ReviewPayload }) =>
      createProductReview(slug, payload),
    onSuccess: (_response, { slug }) => {
      invalidateProductReviews(queryClient, slug);
    },
  });
}

export function useUpdateReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      payload,
    }: {
      reviewId: number;
      slug: string;
      payload: ReviewPayload;
    }) => updateReview(reviewId, payload),
    onSuccess: (_response, { slug }) => {
      invalidateProductReviews(queryClient, slug);
    },
  });
}

export function useDeleteReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId }: { reviewId: number; slug: string }) =>
      deleteReview(reviewId),
    onSuccess: (_response, { slug }) => {
      invalidateProductReviews(queryClient, slug);
    },
  });
}
