import type { ReactNode } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Minus,
  RotateCcw,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';

export type VerdictStatus =
  'idle' | 'loading' | 'ready' | 'fallback' | 'error' | 'quota_exceeded';

export interface VerdictProductItem {
  id: number | string;
  name: string;
  strengths?: string[];
  weaknesses?: string[];
  fitScore?: number;
  highlight?: string;
}

export interface VerdictData {
  title?: string;
  headline?: string;
  verdict?: string;
  fitScore?: number; // 0 to 100
  fitLabel?: string;
  whyItFits?: string[];
  tradeoffs?: string[];
  products?: VerdictProductItem[];
  sourceNote?: string;
}

export interface VerdictPanelProps {
  status?: VerdictStatus;
  data?: VerdictData | null;
  title?: string;
  headline?: string;
  verdict?: string;
  fitScore?: number;
  fitLabel?: string;
  whyItFits?: string[];
  tradeoffs?: string[];
  products?: VerdictProductItem[];
  sourceNote?: string;
  onGenerate?: () => void;
  onRetry?: () => void;
  onRegenerate?: () => void;
  generateLabel?: string;
  idleTitle?: string;
  idleDescription?: string;
  errorMessage?: string;
  fallbackMessage?: string;
  quotaMessage?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Consistent signature AI mark (◈-style diamond icon).
 */
export function AiMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className={cn('size-4 shrink-0 text-accent', className)}
      aria-hidden="true"
    >
      <path
        d="M12 2L21 12L12 22L3 12Z"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <polygon
        points="12,7 16.5,12 12,17 7.5,12"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

/**
 * Fit score segmented meter (reminiscent of: Fit  ▓▓▓▓▓▓▓▓░░ 87).
 */
export function FitMeter({
  score,
  label = 'Fit',
  className,
}: {
  score: number;
  label?: string;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  const filledSegments = Math.round(clamped / 10);

  return (
    <div
      className={cn('inline-flex items-center gap-2', className)}
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label}: ${clamped} out of 100`}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div
        className="flex items-center gap-0.5 rounded-sm border border-border/60 bg-muted/30 p-1"
        aria-hidden="true"
      >
        {Array.from({ length: 10 }).map((_, index) => (
          <span
            key={index}
            className={cn(
              'h-3 w-1.5 rounded-[1px] transition-colors',
              index < filledSegments
                ? 'bg-accent'
                : 'bg-muted-foreground/20 dark:bg-muted-foreground/15',
            )}
          />
        ))}
      </div>
      <span className="font-heading text-sm font-bold tabular-nums text-foreground">
        {clamped}
      </span>
    </div>
  );
}

function ProsList({
  items,
  title = 'Why it fits',
}: {
  items: string[];
  title?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <ul className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="flex items-start gap-2 text-sm leading-relaxed text-foreground"
          >
            <Check
              className="mt-0.5 size-4 shrink-0 text-positive"
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConsList({
  items,
  title = 'Trade-offs',
}: {
  items: string[];
  title?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <ul className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="flex items-start gap-2 text-sm leading-relaxed text-foreground"
          >
            <Minus
              className="mt-0.5 size-4 shrink-0 text-negative"
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Signature Pickwise Verdict Panel component.
 *
 * Implements the design specifications:
 * - Left accent rule in Marigold
 * - Subtle tinted surface (bg-verdict-surface)
 * - Consistent AI mark (◈)
 * - Fit meter (Fit ▓▓▓▓▓▓▓▓░░ 87)
 * - Why it fits (Check / Moss) and Trade-offs (Minus / Brick)
 * - Trust provenance source note
 * - States: idle, loading, ready, fallback, error, quota_exceeded
 */
export function VerdictPanel({
  status = 'ready',
  data,
  title: titleProp,
  headline: headlineProp,
  verdict: verdictProp,
  fitScore: fitScoreProp,
  fitLabel: fitLabelProp,
  whyItFits: whyItFitsProp,
  tradeoffs: tradeoffsProp,
  products: productsProp,
  sourceNote: sourceNoteProp,
  onGenerate,
  onRetry,
  onRegenerate,
  generateLabel = 'Get AI verdict',
  idleTitle = 'Get an AI verdict on this comparison',
  idleDescription = 'Analyze the key differences, strengths, and trade-offs to see which product best fits your priorities.',
  errorMessage = 'An error occurred while generating the AI verdict. Please check your connection and try again.',
  fallbackMessage = 'AI verdict is currently unavailable',
  quotaMessage = "You've used today's AI answers. Browse, compare, and filter products directly in the meantime. Your quota will reset at midnight.",
  actions,
  className,
}: VerdictPanelProps) {
  // Extract values, favoring explicit props over data object fields
  const title = titleProp ?? data?.title ?? 'Verdict';
  const headline =
    headlineProp ?? data?.headline ?? data?.verdict ?? verdictProp;
  const verdictText = verdictProp ?? data?.verdict;
  const fitScore = fitScoreProp ?? data?.fitScore;
  const fitLabel = fitLabelProp ?? data?.fitLabel ?? 'Fit';
  const whyItFits = whyItFitsProp ?? data?.whyItFits ?? [];
  const tradeoffs = tradeoffsProp ?? data?.tradeoffs ?? [];
  const products = productsProp ?? data?.products ?? [];
  const sourceNote = sourceNoteProp ?? data?.sourceNote;

  // 1. IDLE STATE
  if (status === 'idle') {
    return (
      <Card
        className={cn(
          'border-l-4 border-l-accent bg-verdict-surface shadow-xs',
          className,
        )}
      >
        <CardHeader className="p-5 sm:p-6 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AiMark />
              <Badge variant="accent" className="font-semibold text-[11px]">
                {title}
              </Badge>
            </div>
            {sourceNote && (
              <span className="text-xs text-muted-foreground">
                {sourceNote}
              </span>
            )}
          </div>
          <CardTitle
            role="heading"
            aria-level={3}
            className="mt-2 text-lg font-semibold text-foreground"
          >
            {idleTitle}
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm text-muted-foreground">
            {idleDescription}
          </CardDescription>
        </CardHeader>

        {(onGenerate || actions) && (
          <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0 space-y-3">
            {actions}
            {onGenerate && (
              <Button
                type="button"
                onClick={onGenerate}
                className="gap-2 font-medium"
              >
                <AiMark className="size-3.5 text-primary-foreground" />
                {generateLabel}
              </Button>
            )}
          </CardContent>
        )}
      </Card>
    );
  }

  // 2. LOADING STATE
  if (status === 'loading') {
    return (
      <Card
        className={cn(
          'border-l-4 border-l-accent bg-verdict-surface shadow-xs',
          className,
        )}
        role="status"
        aria-busy="true"
      >
        <span className="sr-only">
          Analyzing products and generating AI verdict...
        </span>
        <CardHeader className="p-5 sm:p-6 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AiMark className="animate-pulse" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="mt-3 h-6 w-3/4 max-w-md" />
        </CardHeader>

        <CardContent className="flex flex-col gap-4 px-5 pb-5 sm:px-6 sm:pb-6 pt-0">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border/50 pt-3">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // 3. FALLBACK STATE
  if (status === 'fallback') {
    return (
      <Card
        className={cn(
          'border-l-4 border-l-warning bg-verdict-surface shadow-xs',
          className,
        )}
      >
        <CardHeader className="p-5 sm:p-6 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="size-4 text-warning"
                aria-hidden="true"
              />
              <Badge variant="warning" className="font-semibold text-[11px]">
                Catalog fallback
              </Badge>
            </div>
            {sourceNote && (
              <span className="text-xs text-muted-foreground">
                {sourceNote}
              </span>
            )}
          </div>
          <CardTitle
            role="heading"
            aria-level={3}
            className="mt-2 text-base font-semibold text-foreground"
          >
            {fallbackMessage}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Showing catalog recommendations. You can still review all raw specs,
            features, and customer ratings directly below.
          </CardDescription>
        </CardHeader>

        {onRetry && (
          <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="gap-2"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Try again
            </Button>
          </CardContent>
        )}
      </Card>
    );
  }

  // 4. ERROR STATE
  if (status === 'error') {
    return (
      <Card
        className={cn(
          'border-l-4 border-l-negative bg-verdict-surface shadow-xs',
          className,
        )}
        role="alert"
      >
        <CardHeader className="p-5 sm:p-6 pb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-negative" aria-hidden="true" />
            <Badge variant="negative" className="font-semibold text-[11px]">
              Verdict error
            </Badge>
          </div>
          <CardTitle
            role="heading"
            aria-level={3}
            className="mt-2 text-base font-semibold text-foreground"
          >
            Could not generate verdict
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {errorMessage}
          </CardDescription>
        </CardHeader>

        {onRetry && (
          <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="gap-2"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Retry
            </Button>
          </CardContent>
        )}
      </Card>
    );
  }

  // 5. QUOTA EXCEEDED STATE
  if (status === 'quota_exceeded') {
    return (
      <Card
        className={cn(
          'border-l-4 border-l-accent bg-verdict-surface shadow-xs',
          className,
        )}
      >
        <CardHeader className="p-5 sm:p-6 pb-4">
          <div className="flex items-center gap-2">
            <AiMark className="opacity-70" />
            <Badge variant="accent" className="font-semibold text-[11px]">
              Daily limit reached
            </Badge>
          </div>
          <CardTitle
            role="heading"
            aria-level={3}
            className="mt-2 text-base font-semibold text-foreground"
          >
            Daily AI quota reached
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {quotaMessage}
          </CardDescription>
        </CardHeader>

        {actions && (
          <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0">
            {actions}
          </CardContent>
        )}
      </Card>
    );
  }

  // 6. READY STATE
  const hasProducts = products.length > 0;
  const hasDirectWhyItFits = whyItFits.length > 0;
  const hasDirectTradeoffs = tradeoffs.length > 0;

  return (
    <section
      aria-label="AI Verdict"
      className={cn(
        'rounded-xl border border-border border-l-4 border-l-accent bg-verdict-surface shadow-xs transition-colors',
        className,
      )}
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3 sm:p-6 sm:pb-3">
        <div className="flex items-center gap-2">
          <AiMark />
          <Badge variant="accent" className="font-semibold text-[11px]">
            {title}
          </Badge>
        </div>

        {fitScore !== undefined && (
          <FitMeter score={fitScore} label={fitLabel} />
        )}
      </div>

      {/* Main Verdict Headline / Paragraph */}
      {(headline || verdictText) && (
        <div className="px-5 pb-4 sm:px-6">
          <h3 className="font-heading text-lg font-semibold leading-snug text-foreground sm:text-xl">
            {headline}
          </h3>
          {verdictText && verdictText !== headline && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {verdictText}
            </p>
          )}
        </div>
      )}

      {/* Single Product or Global Strengths & Trade-offs */}
      {(hasDirectWhyItFits || hasDirectTradeoffs) && (
        <div className="grid grid-cols-1 gap-6 px-5 pb-4 sm:px-6 sm:pb-5 md:grid-cols-2">
          {hasDirectWhyItFits && <ProsList items={whyItFits} />}
          {hasDirectTradeoffs && <ConsList items={tradeoffs} />}
        </div>
      )}

      {/* Multi-Product Breakdown (Comparison) */}
      {hasProducts && (
        <div className="px-5 pb-4 sm:px-6 sm:pb-5">
          <div
            className={cn(
              'grid grid-cols-1 gap-4 pt-2',
              products.length === 2 && 'md:grid-cols-2',
              products.length >= 3 && 'md:grid-cols-2 lg:grid-cols-3',
              products.length >= 4 && 'xl:grid-cols-4',
            )}
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card p-4 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                  <h4 className="font-heading text-sm font-semibold text-foreground line-clamp-1">
                    {product.name}
                  </h4>
                  {product.fitScore !== undefined && (
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-accent">
                      {product.fitScore}%
                    </span>
                  )}
                </div>

                {product.highlight && (
                  <p className="text-xs font-medium text-muted-foreground italic">
                    {product.highlight}
                  </p>
                )}

                {product.strengths && product.strengths.length > 0 && (
                  <ProsList items={product.strengths} title="Strengths" />
                )}

                {product.weaknesses && product.weaknesses.length > 0 && (
                  <ConsList items={product.weaknesses} title="Weaknesses" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer: Actions, Regenerate, Source note */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 px-5 py-3.5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {onRegenerate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              className="gap-1.5 text-xs font-medium"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Regenerate
            </Button>
          )}
        </div>

        {sourceNote && (
          <span className="text-xs text-muted-foreground ml-auto">
            {sourceNote}
          </span>
        )}
      </div>
    </section>
  );
}
