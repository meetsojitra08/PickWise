import { GitCompare } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { CompareMatrix } from '@/features/compare/components/CompareMatrix';
import { CompareMatrixSkeleton } from '@/features/compare/components/CompareMatrixSkeleton';
import { useCompare } from '@/features/compare/hooks/use-compare';
import { useCompareMatrix } from '@/features/compare/hooks/use-compare-matrix';
import { isApiError } from '@/lib/api-error';

interface ComparisonErrorStateProps {
  error: unknown;
  onClear: () => void;
  onRetry: () => void;
}

function ComparisonErrorState({
  error,
  onClear,
  onRetry,
}: ComparisonErrorStateProps) {
  const status = isApiError(error) ? error.status : 0;

  if (status === 422 || status === 404) {
    return (
      <EmptyState
        title="These products can't be compared"
        description={
          (isApiError(error) && error.getFirstFieldError('product_ids')) ||
          'One or more products are no longer available. Clear the comparison and pick again.'
        }
        actionLabel="Clear comparison"
        onAction={onClear}
      />
    );
  }

  return (
    <EmptyState
      title="The comparison could not load"
      description="Check your connection and try again."
      actionLabel="Try again"
      onAction={onRetry}
    />
  );
}

export function ComparePage() {
  const { items, canCompare, clear } = useCompare();
  const productIds = items.map((item) => item.id);
  const matrixQuery = useCompareMatrix(productIds);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-col gap-2 border-b border-border pb-6">
        <p className="text-sm font-medium text-primary">Compare</p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Compare products side by side
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          See where two to four products differ on price, specs and ratings,
          then choose with confidence.
        </p>
      </header>

      {!canCompare ? (
        <EmptyState
          title="Pick at least two products to compare."
          description={
            items.length === 0
              ? 'Add products from the same category to see their prices and specs in one table.'
              : 'Add one more product from the same category to see them side by side.'
          }
          actionLabel="Browse products"
          actionTo="/products"
          icon={
            <GitCompare
              className="size-5"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          }
        />
      ) : matrixQuery.isPending ? (
        <CompareMatrixSkeleton />
      ) : matrixQuery.isError ? (
        <ComparisonErrorState
          error={matrixQuery.error}
          onClear={clear}
          onRetry={() => void matrixQuery.refetch()}
        />
      ) : (
        <CompareMatrix matrix={matrixQuery.data.data} />
      )}
    </section>
  );
}
