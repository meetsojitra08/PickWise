import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAR_POSITIONS = [1, 2, 3, 4, 5] as const;

export interface RatingStarsProps {
  rating: number;
  count?: number;
  size?: 'sm' | 'default';
  showNumeric?: boolean;
  className?: string;
}

function clampRating(rating: number): number {
  if (!Number.isFinite(rating)) {
    return 0;
  }

  return Math.min(5, Math.max(0, rating));
}

function buildAccessibleRatingLabel(rating: number, count?: number): string {
  if (count === 0) {
    return 'No customer reviews yet';
  }

  const formattedRating = rating.toFixed(1);

  if (count === undefined) {
    return `Rated ${formattedRating} out of 5`;
  }

  const reviewUnit = count === 1 ? 'review' : 'reviews';
  return `Rated ${formattedRating} out of 5 based on ${count} ${reviewUnit}`;
}

export function RatingStars({
  rating,
  count,
  size = 'default',
  showNumeric = true,
  className,
}: RatingStarsProps) {
  const safeRating = clampRating(rating);
  const hasNoReviews = count === 0;
  const visualRating = hasNoReviews ? 0 : Math.round(safeRating * 2) / 2;
  const starSizeClass = size === 'sm' ? 'size-3.5' : 'size-4';
  const textSizeClass = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div
      role="img"
      aria-label={buildAccessibleRatingLabel(safeRating, count)}
      className={cn(
        'inline-flex items-center gap-1.5',
        textSizeClass,
        className,
      )}
    >
      <span aria-hidden="true" className="inline-flex items-center gap-0.5">
        {STAR_POSITIONS.map((position) => {
          if (visualRating >= position) {
            return (
              <Star
                key={position}
                data-star-state="full"
                className={cn(
                  starSizeClass,
                  'fill-accent text-warning dark:text-accent',
                )}
                strokeWidth={1.5}
              />
            );
          }

          if (visualRating >= position - 0.5) {
            return (
              <span
                key={position}
                data-star-state="half"
                className="relative inline-flex shrink-0"
              >
                <Star
                  className={cn(starSizeClass, 'text-muted-foreground/45')}
                  strokeWidth={1.5}
                />
                <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
                  <Star
                    className={cn(
                      starSizeClass,
                      'fill-accent text-warning dark:text-accent',
                    )}
                    strokeWidth={1.5}
                  />
                </span>
              </span>
            );
          }

          return (
            <Star
              key={position}
              data-star-state="empty"
              className={cn(starSizeClass, 'text-muted-foreground/45')}
              strokeWidth={1.5}
            />
          );
        })}
      </span>

      {hasNoReviews ? (
        <span aria-hidden="true" className="text-muted-foreground">
          No reviews
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="inline-flex items-center gap-1 tabular-nums"
        >
          {showNumeric ? (
            <span className="font-medium text-foreground">
              {safeRating.toFixed(1)}
            </span>
          ) : null}
          {count !== undefined ? (
            <span className="text-muted-foreground">
              ({new Intl.NumberFormat('en-IN').format(count)})
            </span>
          ) : null}
        </span>
      )}
    </div>
  );
}
