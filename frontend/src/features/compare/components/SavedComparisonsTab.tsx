import { GitCompare } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SavedComparisonCard } from '@/features/compare/components/SavedComparisonCard';
import { useComparisons } from '@/features/compare/hooks/use-saved-comparisons';

export function SavedComparisonsTab() {
  const comparisons = useComparisons();

  if (comparisons.isPending) {
    return (
      <div
        className="space-y-3"
        role="status"
        aria-label="Loading saved comparisons"
      >
        {[0, 1].map((index) => (
          <Skeleton key={index} className="h-40 w-full rounded-card" />
        ))}
      </div>
    );
  }

  if (comparisons.isError) {
    return (
      <EmptyState
        title="Your saved comparisons could not load"
        description="Check your connection and try again."
        actionLabel="Try again"
        onAction={() => void comparisons.refetch()}
        icon={
          <GitCompare className="size-5" strokeWidth={1.5} aria-hidden="true" />
        }
      />
    );
  }

  if (comparisons.items.length === 0) {
    return (
      <EmptyState
        title="No saved comparisons yet"
        description="Compare 2 to 4 products side by side and save the spec matrix to revisit or share later."
        actionLabel="Compare products"
        actionTo="/compare"
        icon={
          <GitCompare className="size-5" strokeWidth={1.5} aria-hidden="true" />
        }
      />
    );
  }

  return (
    <section aria-labelledby="saved-comparisons-heading">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="saved-comparisons-heading"
          className="font-heading text-2xl font-semibold tracking-tight"
        >
          Saved comparisons
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {comparisons.total} saved{' '}
          {comparisons.total === 1 ? 'comparison' : 'comparisons'}
        </p>
      </div>

      <div className="space-y-3">
        {comparisons.items.map((comparison) => (
          <SavedComparisonCard key={comparison.id} comparison={comparison} />
        ))}
      </div>

      {comparisons.hasNextPage ? (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={comparisons.isFetchingNextPage}
            onClick={() => void comparisons.fetchNextPage()}
          >
            {comparisons.isFetchingNextPage
              ? 'Loading…'
              : 'Load more comparisons'}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
