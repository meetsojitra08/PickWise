import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReviewCard } from '@/features/reviews/components/ReviewCard';
import type { Review, ReviewPayload } from '@/features/reviews/types/reviews';

interface ReviewListProps {
  reviews: Review[];
  page: number;
  lastPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onUpdate: (review: Review, payload: ReviewPayload) => Promise<void>;
  onDelete: (review: Review) => Promise<void>;
  deletingReviewId: number | null;
}

export function ReviewList({
  reviews,
  page,
  lastPage,
  total,
  onPageChange,
  onUpdate,
  onDelete,
  deletingReviewId,
}: ReviewListProps) {
  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-heading text-xl font-semibold tracking-tight">
          Customer reviews
        </h3>
        {total > 0 ? (
          <p className="text-sm text-muted-foreground tabular-nums">
            {total} {total === 1 ? 'review' : 'reviews'}
          </p>
        ) : null}
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-heading text-xl font-semibold">
              No reviews yet. Be the first to share your experience.
            </p>
            <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
              If you have used this product, your notes could help the next
              shopper decide.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
          {reviews.map((review) => (
            <li key={review.id}>
              <ReviewCard
                review={review}
                onUpdate={onUpdate}
                onDelete={onDelete}
                isDeleting={deletingReviewId === review.id}
              />
            </li>
          ))}
        </ul>
      )}

      {lastPage > 1 ? (
        <nav
          aria-label="Review pagination"
          className="mt-4 flex flex-wrap items-center justify-between gap-3"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <p className="text-sm text-muted-foreground tabular-nums">
            Page {page} of {lastPage}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= lastPage}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
