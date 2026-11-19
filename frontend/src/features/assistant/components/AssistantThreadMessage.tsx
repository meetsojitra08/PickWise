import { AlertTriangle, Columns3 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { AiMark } from '@/components/shared/VerdictPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ProductSummary } from '@/features/catalog/types/catalog';
import { useCompare } from '@/features/compare/hooks/use-compare';
import { cn } from '@/lib/utils';
import type { AssistantMessage } from '../types/assistant';
import { AssistantRecommendationCard } from './AssistantRecommendationCard';

interface AssistantThreadMessageProps {
  message: AssistantMessage;
  className?: string;
}

export function AssistantThreadMessage({
  message,
  className,
}: AssistantThreadMessageProps) {
  const navigate = useNavigate();
  const { replace: replaceCompareProducts } = useCompare();

  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div
        className={cn(
          'flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-200',
          className,
        )}
      >
        <div className="max-w-xl rounded-2xl rounded-tr-xs bg-primary px-4 py-3 text-sm text-primary-foreground shadow-xs">
          <p className="whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  const isFallback = message.status === 'fallback';
  const recommendations = message.recommendations ?? [];
  const alternatives = message.alternatives ?? [];
  const hasRecommendations = recommendations.length > 0;
  const hasAlternatives = alternatives.length > 0;

  // Extract products eligible for comparison
  const comparableProducts = (
    hasRecommendations ? recommendations : alternatives
  )
    .map((item) => item.product)
    .filter((p): p is ProductSummary => p !== null);

  const canComparePicks = comparableProducts.length >= 2;

  function handleCompareThese() {
    replaceCompareProducts(comparableProducts.slice(0, 4));
    navigate('/compare');
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 sm:flex-row sm:items-start sm:gap-3.5',
        className,
      )}
    >
      {/* Advisor Avatar (side rail on sm+) */}
      <div
        className="hidden size-9 shrink-0 items-center justify-center rounded-xl border border-accent/40 bg-accent/15 text-accent shadow-xs sm:mt-1 sm:flex"
        aria-hidden="true"
      >
        <AiMark className="size-4.5 text-accent" />
      </div>

      <div className="min-w-0 flex-1 space-y-4">
        {/* Advisor identity header */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-accent/40 bg-accent/15 text-accent shadow-xs sm:hidden"
            aria-hidden="true"
          >
            <AiMark className="size-3.5 text-accent" />
          </div>
          <span className="font-heading text-xs font-bold text-foreground">
            Pickwise Advisor
          </span>
          <span className="text-[10px] text-muted-foreground">
            · Database-grounded
          </span>
        </div>

        {/* Fallback Warning Notice */}
        {isFallback && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning-subtle p-3.5 text-xs text-foreground shadow-2xs"
          >
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-warning"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold text-sm text-foreground">
                AI is temporarily unavailable
              </p>
              <p className="mt-0.5 text-muted-foreground leading-relaxed">
                Showing matching products directly from our catalog that fit
                your criteria.
              </p>
            </div>
          </div>
        )}

        {/* Assistant Content text */}
        {message.content && (
          <div className="rounded-xl border border-border/60 bg-card p-4 text-sm leading-relaxed text-foreground shadow-2xs">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        )}

        {/* Recommendations list */}
        {hasRecommendations && (
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-heading text-sm font-bold text-foreground">
                {isFallback ? 'Matching products' : 'Recommended for you'}
              </h3>

              {canComparePicks && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCompareThese}
                  className="h-8 gap-1.5 text-xs font-medium border-primary/30 text-primary hover:bg-primary/5"
                >
                  <Columns3 className="size-3.5" aria-hidden="true" />
                  Compare these ({comparableProducts.length})
                </Button>
              )}
            </div>

            <div className="grid gap-3.5 sm:grid-cols-1 md:grid-cols-2">
              {message.recommendations.map((rec) => (
                <AssistantRecommendationCard
                  key={rec.product_id}
                  recommendation={rec}
                  variant={isFallback ? 'fallback' : 'recommendation'}
                />
              ))}
            </div>
          </div>
        )}

        {/* Alternatives list */}
        {hasAlternatives && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-sm font-bold text-foreground">
                  Close alternatives
                </h3>
                <Badge variant="warning" className="text-[11px] font-semibold">
                  Up to 15% over budget
                </Badge>
              </div>

              {canComparePicks && !hasRecommendations && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCompareThese}
                  className="h-8 gap-1.5 text-xs font-medium border-primary/30 text-primary hover:bg-primary/5"
                >
                  <Columns3 className="size-3.5" aria-hidden="true" />
                  Compare these ({comparableProducts.length})
                </Button>
              )}
            </div>

            <div className="grid gap-3.5 sm:grid-cols-1 md:grid-cols-2">
              {message.alternatives.map((alt) => (
                <AssistantRecommendationCard
                  key={alt.product_id}
                  recommendation={alt}
                  variant="alternative"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
