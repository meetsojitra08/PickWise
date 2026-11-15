import { Check, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type {
  ReviewSentiment,
  ReviewSummary,
} from '@/features/reviews/types/reviews';
import { cn } from '@/lib/utils';

const MINIMUM_REVIEWS = 3;

const SENTIMENT_LABELS: Record<
  ReviewSentiment,
  { label: string; variant: 'positive' | 'secondary' | 'negative' }
> = {
  positive: { label: 'Mostly positive', variant: 'positive' },
  mixed: { label: 'Mixed', variant: 'secondary' },
  negative: { label: 'Mostly negative', variant: 'negative' },
};

interface ReviewSummaryCardProps {
  summary: ReviewSummary | null;
  approvedReviewCount: number;
}

interface SummaryThemeProps {
  title: string;
  items: string[];
  tone: 'positive' | 'negative';
}

function SummaryTheme({ title, items, tone }: SummaryThemeProps) {
  if (items.length === 0) return null;

  const Icon = tone === 'positive' ? Check : Minus;

  return (
    <div>
      <h3 className="font-heading text-sm font-semibold">{title}</h3>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="flex items-start gap-2 text-sm leading-relaxed"
          >
            <Icon
              className={cn(
                'mt-0.5 size-4 shrink-0',
                tone === 'positive' ? 'text-positive' : 'text-negative',
              )}
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReviewSummaryCard({
  summary,
  approvedReviewCount,
}: ReviewSummaryCardProps) {
  if (!summary) {
    if (approvedReviewCount >= MINIMUM_REVIEWS) return null;

    return (
      <section className="mt-12" aria-labelledby="review-summary-heading">
        <Card className="border-l-4 border-l-accent bg-verdict-surface">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle>
                <h2
                  id="review-summary-heading"
                  className="font-heading text-2xl font-semibold tracking-tight"
                >
                  What buyers say
                </h2>
              </CardTitle>
              <Badge variant="accent">AI summary</Badge>
            </div>
            <CardDescription>
              Not enough reviews yet. A summary appears once this product has{' '}
              {MINIMUM_REVIEWS} approved reviews.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    );
  }

  const sentiment = SENTIMENT_LABELS[summary.sentiment];

  return (
    <section className="mt-12" aria-labelledby="review-summary-heading">
      <Card className="border-l-4 border-l-accent bg-verdict-surface">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle>
              <h2
                id="review-summary-heading"
                className="font-heading text-2xl font-semibold tracking-tight"
              >
                What buyers say
              </h2>
            </CardTitle>
            <Badge variant="accent">AI summary</Badge>
            <Badge variant={sentiment.variant}>{sentiment.label}</Badge>
          </div>
          <CardDescription>
            Based on {summary.reviews_count} approved{' '}
            {summary.reviews_count === 1 ? 'review' : 'reviews'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="max-w-prose text-base leading-relaxed">
            {summary.summary}
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <SummaryTheme
              title="What people like"
              items={summary.pros}
              tone="positive"
            />
            <SummaryTheme
              title="What people dislike"
              items={summary.cons}
              tone="negative"
            />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
