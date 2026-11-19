import { Check, MessageSquarePlus, Minus } from 'lucide-react';
import { AiMark } from '@/components/shared/VerdictPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
  isLoading?: boolean;
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
  isLoading = false,
}: ReviewSummaryCardProps) {
  if (isLoading) {
    return (
      <section
        className="mt-12"
        aria-labelledby="review-summary-loading-heading"
        role="status"
        aria-busy="true"
      >
        <Card className="border-l-4 border-l-accent bg-verdict-surface">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <AiMark className="animate-pulse" />
              <CardTitle>
                <h2
                  id="review-summary-loading-heading"
                  className="font-heading text-2xl font-semibold tracking-tight"
                >
                  What buyers say
                </h2>
              </CardTitle>
              <Badge variant="accent" className="gap-1.5">
                <AiMark className="size-3" />
                <span>AI summary</span>
              </Badge>
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-48 mt-1" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 max-w-prose">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (!summary) {
    if (approvedReviewCount >= MINIMUM_REVIEWS) return null;

    const remainingNeeded = Math.max(0, MINIMUM_REVIEWS - approvedReviewCount);

    return (
      <section className="mt-12" aria-labelledby="review-summary-heading">
        <Card className="border-l-4 border-l-accent bg-verdict-surface shadow-2xs">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <AiMark />
              <CardTitle>
                <h2
                  id="review-summary-heading"
                  className="font-heading text-2xl font-semibold tracking-tight"
                >
                  What buyers say
                </h2>
              </CardTitle>
              <Badge variant="accent" className="gap-1.5">
                <AiMark className="size-3" />
                <span>AI summary</span>
              </Badge>
            </div>
            <CardDescription className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              Not enough reviews yet. A summary appears once this product has{' '}
              {MINIMUM_REVIEWS} approved reviews ({approvedReviewCount} of{' '}
              {MINIMUM_REVIEWS} submitted so far). Add your review below to help
              generate an AI summary.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-semibold rounded-full"
            >
              <a href="#reviews">
                <MessageSquarePlus className="size-3.5" aria-hidden="true" />
                <span>
                  {remainingNeeded === 1
                    ? 'Add the 1 review needed'
                    : 'Write a review'}
                </span>
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  const sentiment = SENTIMENT_LABELS[summary.sentiment];

  return (
    <section className="mt-12" aria-labelledby="review-summary-heading">
      <Card className="border-l-4 border-l-accent bg-verdict-surface shadow-2xs">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <AiMark />
            <CardTitle>
              <h2
                id="review-summary-heading"
                className="font-heading text-2xl font-semibold tracking-tight"
              >
                What buyers say
              </h2>
            </CardTitle>
            <Badge variant="accent" className="gap-1.5">
              <AiMark className="size-3" />
              <span>AI summary</span>
            </Badge>
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
          <div className="grid gap-6 sm:grid-cols-2 mt-4">
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
