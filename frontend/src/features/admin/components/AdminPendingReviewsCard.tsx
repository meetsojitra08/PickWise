import { ArrowRight, CheckCircle2, MessageSquareAlert } from 'lucide-react';
import { Link } from 'react-router';
import { RatingStars } from '@/components/shared/RatingStars';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminPendingReviewItem } from '../types';

export interface AdminPendingReviewsCardProps {
  reviews: AdminPendingReviewItem[];
  pendingCount: number;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return dateString;
    }
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
      return 'just now';
    }
    if (diffMin < 60) {
      return `${diffMin}m ago`;
    }
    if (diffHour < 24) {
      return `${diffHour}h ago`;
    }
    if (diffDay < 7) {
      return `${diffDay}d ago`;
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function AdminPendingReviewsCard({
  reviews,
  pendingCount,
}: AdminPendingReviewsCardProps) {
  return (
    <Card className="flex h-full flex-col border border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-control bg-accent/20 text-warning dark:text-accent">
            <MessageSquareAlert
              className="size-4"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Review Moderation Queue
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {pendingCount === 1
                ? '1 review awaiting moderation'
                : `${pendingCount} reviews awaiting moderation`}
            </p>
          </div>
        </div>

        <Link
          to="/admin/reviews"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Open queue
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pt-0">
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-control border border-dashed border-border py-8 text-center">
            <CheckCircle2 className="size-8 text-positive" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-foreground">
              Queue is all clear
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              All submitted shopper reviews have been reviewed.
            </p>
          </div>
        ) : (
          <ul
            data-testid="admin-pending-reviews-list"
            className="divide-y divide-border/60"
          >
            {reviews.map((review) => (
              <li
                key={review.id}
                className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <RatingStars rating={review.rating} size="sm" />
                    <span className="text-xs font-medium text-foreground">
                      {review.author_name}
                    </span>
                  </div>
                  <time
                    dateTime={review.created_at}
                    className="text-xs text-muted-foreground tabular-nums whitespace-nowrap"
                  >
                    {formatRelativeTime(review.created_at)}
                  </time>
                </div>

                <div className="text-xs font-semibold text-foreground line-clamp-1">
                  {review.title}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {review.body}
                </p>

                {review.product ? (
                  <div className="text-[11px] text-muted-foreground">
                    Product:{' '}
                    <span className="font-medium text-foreground">
                      {review.product.name}
                    </span>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
