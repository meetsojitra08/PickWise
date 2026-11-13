import { GitCompare } from 'lucide-react';
import { useParams } from 'react-router';
import { EmptyState } from '@/components/shared/EmptyState';
import { CompareMatrix } from '@/features/compare/components/CompareMatrix';
import { CompareMatrixSkeleton } from '@/features/compare/components/CompareMatrixSkeleton';
import { useSharedComparison } from '@/features/compare/hooks/use-saved-comparisons';

export function SharedComparisonPage() {
  const { token = '' } = useParams();
  const comparison = useSharedComparison(token);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-col gap-2 border-b border-border pb-6">
        <p className="text-sm font-medium text-primary">Shared comparison</p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {comparison.data?.data.name ?? 'Product comparison'}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          A read-only comparison shared by a Pickwise shopper.
        </p>
      </header>

      {comparison.isPending ? (
        <CompareMatrixSkeleton />
      ) : comparison.isError ? (
        <EmptyState
          title="This comparison isn't available"
          description="The link may have expired or sharing may have been stopped."
          actionLabel="Compare products yourself"
          actionTo="/products"
          icon={
            <GitCompare
              className="size-5"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          }
        />
      ) : comparison.data.data.matrix === null ? (
        <EmptyState
          title="These products are no longer available"
          description="The shopper removed or unpublished the products in this comparison. Start a fresh comparison from the catalog."
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
      ) : (
        <>
          {comparison.data.data.unavailable_count > 0 ? (
            <p
              role="status"
              className="mb-4 rounded-control border border-warning/30 bg-warning-subtle px-3.5 py-3 text-sm text-warning"
            >
              {comparison.data.data.unavailable_count}{' '}
              {comparison.data.data.unavailable_count === 1
                ? 'product is'
                : 'products are'}{' '}
              no longer available and hidden from this comparison.
            </p>
          ) : null}
          <CompareMatrix matrix={comparison.data.data.matrix} />
        </>
      )}
    </section>
  );
}
