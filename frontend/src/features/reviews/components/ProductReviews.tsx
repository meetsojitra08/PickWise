import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ReviewDistribution } from '@/features/reviews/components/ReviewDistribution';
import { ReviewForm } from '@/features/reviews/components/ReviewForm';
import { ReviewList } from '@/features/reviews/components/ReviewList';
import {
  useCreateReviewMutation,
  useDeleteReviewMutation,
  useProductReviews,
  useUpdateReviewMutation,
} from '@/features/reviews/hooks/use-reviews';
import type { Review, ReviewPayload } from '@/features/reviews/types/reviews';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { isApiError } from '@/lib/api-error';

function errorMessage(error: unknown): string {
  return isApiError(error)
    ? error.message
    : 'Something went wrong. Please try again.';
}

function ReviewsSkeleton() {
  return (
    <div role="status" aria-label="Loading reviews">
      <div className="grid gap-6 lg:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.2fr)]">
        <div className="rounded-card border border-border bg-card p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-4 h-10 w-20" />
          <div className="mt-6 flex flex-col gap-3">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-2 w-full" />
            ))}
          </div>
        </div>
        <div className="rounded-card border border-border bg-card p-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-4 h-11 w-full" />
          <Skeleton className="mt-3 h-11 w-full" />
          <Skeleton className="mt-3 h-28 w-full" />
        </div>
      </div>
      <div className="mt-6 overflow-hidden rounded-card border border-border bg-card">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 border-t border-border px-6 py-5 first:border-t-0"
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductReviews({ slug }: { slug: string }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const location = useLocation();
  const [page, setPage] = useState(1);
  const reviewsQuery = useProductReviews(slug, page);
  const createMutation = useCreateReviewMutation();
  const updateMutation = useUpdateReviewMutation();
  const deleteMutation = useDeleteReviewMutation();

  async function handleCreate(payload: ReviewPayload): Promise<void> {
    await createMutation.mutateAsync({ slug, payload });
    toast.success('Review submitted');
    if (page !== 1) {
      setPage(1);
    }
  }

  async function handleUpdate(
    review: Review,
    payload: ReviewPayload,
  ): Promise<void> {
    await updateMutation.mutateAsync({
      reviewId: review.id,
      slug,
      payload,
    });
    toast.success('Review updated. It will be visible again after approval.');
  }

  async function handleDelete(review: Review): Promise<void> {
    try {
      await deleteMutation.mutateAsync({ reviewId: review.id, slug });
      toast.success('Review deleted');
      if (reviewsQuery.data?.data.length === 1 && page > 1) {
        setPage(page - 1);
      }
    } catch (error: unknown) {
      toast.error(errorMessage(error));
      throw error;
    }
  }

  let actionCard: ReactNode;

  if (isAuthLoading) {
    actionCard = (
      <Card aria-label="Loading review form">
        <CardContent>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-4 h-11 w-full" />
          <Skeleton className="mt-3 h-28 w-full" />
        </CardContent>
      </Card>
    );
  } else if (!isAuthenticated) {
    actionCard = (
      <Card>
        <CardHeader>
          <CardTitle>
            <h3 className="font-heading text-xl font-semibold">
              Share your experience
            </h3>
          </CardTitle>
          <CardDescription>
            Sign in to rate this product and help other shoppers decide.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg">
            <Link to="/login" state={{ from: location }}>
              Log in to write a review
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  } else if (reviewsQuery.data?.meta.own_pending_review) {
    actionCard = (
      <Card>
        <CardHeader>
          <CardTitle>
            <h3 className="font-heading text-xl font-semibold">
              Your review is awaiting approval
            </h3>
          </CardTitle>
          <CardDescription>
            It will appear publicly once approved. You can still edit or delete
            it below.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  } else if (reviewsQuery.data?.meta.has_reviewed) {
    actionCard = (
      <Card>
        <CardHeader>
          <CardTitle>
            <h3 className="font-heading text-xl font-semibold">
              You have already reviewed this product
            </h3>
          </CardTitle>
          <CardDescription>
            Find your review in the list to edit or delete it.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  } else {
    actionCard = (
      <Card>
        <CardHeader>
          <CardTitle>
            <h3 className="font-heading text-xl font-semibold">
              Write a review
            </h3>
          </CardTitle>
          <CardDescription>
            Share what worked, what did not, and who this product suits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewForm onSubmit={handleCreate} />
        </CardContent>
      </Card>
    );
  }

  const deletingReviewId = deleteMutation.isPending
    ? (deleteMutation.variables?.reviewId ?? null)
    : null;

  return (
    <section className="mt-12" aria-labelledby="reviews-heading">
      <div className="mb-5">
        <h2
          id="reviews-heading"
          className="font-heading text-2xl font-semibold tracking-tight"
        >
          Ratings &amp; reviews
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What buyers say after living with this product.
        </p>
      </div>

      {reviewsQuery.isPending ? (
        <ReviewsSkeleton />
      ) : reviewsQuery.isError ? (
        <EmptyState
          title="Reviews could not load"
          description="Check your connection and try again."
          actionLabel="Try again"
          onAction={() => void reviewsQuery.refetch()}
        />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.2fr)]">
            <ReviewDistribution
              distribution={reviewsQuery.data.meta.rating_distribution}
            />
            {actionCard}
          </div>

          <ReviewList
            reviews={reviewsQuery.data.data}
            page={reviewsQuery.data.meta.current_page}
            lastPage={reviewsQuery.data.meta.last_page}
            total={reviewsQuery.data.meta.total}
            onPageChange={setPage}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            deletingReviewId={deletingReviewId}
          />
        </>
      )}
    </section>
  );
}
