import { RatingStars } from '@/components/shared/RatingStars';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RatingDistribution } from '@/features/reviews/types/reviews';

const STAR_VALUES = [5, 4, 3, 2, 1] as const;

interface ReviewDistributionProps {
  distribution: RatingDistribution;
}

export function ReviewDistribution({ distribution }: ReviewDistributionProps) {
  const total = STAR_VALUES.reduce(
    (sum, star) => sum + (distribution[star] ?? 0),
    0,
  );
  const weightedTotal = STAR_VALUES.reduce(
    (sum, star) => sum + star * (distribution[star] ?? 0),
    0,
  );
  const average = total === 0 ? 0 : weightedTotal / total;

  return (
    <Card aria-labelledby="rating-summary-heading">
      <CardHeader>
        <CardTitle>
          <h3
            id="rating-summary-heading"
            className="font-heading text-lg font-semibold"
          >
            Rating summary
          </h3>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <p className="font-heading text-4xl leading-none font-semibold tabular-nums">
            {average.toFixed(1)}
          </p>
          <div className="pb-1">
            <RatingStars rating={average} showNumeric={false} />
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {total === 0
            ? 'No approved reviews yet.'
            : `Based on ${total} approved ${total === 1 ? 'review' : 'reviews'}.`}
        </p>

        <ul className="mt-5 flex flex-col gap-2.5">
          {STAR_VALUES.map((star) => {
            const count = distribution[star] ?? 0;
            const percent = total === 0 ? 0 : Math.round((count / total) * 100);

            return (
              <li
                key={star}
                className="grid grid-cols-[3.25rem_1fr_2rem] items-center gap-3"
              >
                <span className="text-sm text-muted-foreground tabular-nums">
                  {star} star
                </span>
                <div
                  role="progressbar"
                  aria-label={`${star} star reviews`}
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-valuenow={count}
                  className="h-2 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-right text-sm font-medium tabular-nums">
                  {count}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
