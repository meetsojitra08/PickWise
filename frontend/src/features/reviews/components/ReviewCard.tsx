import { useState } from 'react';
import { RatingStars } from '@/components/shared/RatingStars';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReviewForm } from '@/features/reviews/components/ReviewForm';
import type { Review, ReviewPayload } from '@/features/reviews/types/reviews';

function formatReviewDate(createdAt: string | null): string | null {
  if (!createdAt) {
    return null;
  }

  const parsed = new Date(createdAt);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

interface ReviewCardProps {
  review: Review;
  onUpdate: (review: Review, payload: ReviewPayload) => Promise<void>;
  onDelete: (review: Review) => Promise<void>;
  isDeleting: boolean;
}

export function ReviewCard({
  review,
  onUpdate,
  onDelete,
  isDeleting,
}: ReviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const formattedDate = formatReviewDate(review.created_at);

  async function handleUpdate(payload: ReviewPayload): Promise<void> {
    await onUpdate(review, payload);
    setIsEditing(false);
  }

  async function handleDelete(): Promise<void> {
    try {
      await onDelete(review);
    } catch {
      // The parent surfaces the failure as a toast; keep the review visible.
    } finally {
      setIsConfirmingDelete(false);
    }
  }

  return (
    <article className="px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <RatingStars rating={review.rating} size="sm" showNumeric={false} />
          <h4 className="mt-2 font-heading text-lg leading-snug font-semibold break-words">
            {review.title}
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {review.status === 'pending' ? (
            <Badge variant="warning">Awaiting approval</Badge>
          ) : null}
          {review.is_own && !isEditing ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-negative"
                onClick={() => setIsConfirmingDelete(true)}
              >
                Delete
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        {review.author_name}
        {formattedDate ? (
          <>
            {' · '}
            <time dateTime={review.created_at ?? undefined}>
              {formattedDate}
            </time>
          </>
        ) : null}
      </p>

      {isEditing ? (
        <div className="mt-4 rounded-control border border-border bg-muted/20 p-4">
          <p className="mb-3 text-sm font-medium text-foreground">
            Edit your review
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            Saving changes sends your review back for approval.
          </p>
          <ReviewForm
            mode="edit"
            initialValues={{
              rating: review.rating,
              title: review.title,
              body: review.body,
            }}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <p className="mt-3 max-w-prose text-sm leading-relaxed break-words whitespace-pre-line text-muted-foreground">
          {review.body}
        </p>
      )}

      {isConfirmingDelete ? (
        <div
          role="alert"
          className="mt-4 flex flex-col gap-3 rounded-control border border-negative/30 bg-negative-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-negative">
            Delete this review? This cannot be undone.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              aria-busy={isDeleting}
              onClick={() => {
                void handleDelete();
              }}
            >
              {isDeleting ? 'Deleting…' : 'Delete review'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isDeleting}
              onClick={() => setIsConfirmingDelete(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
