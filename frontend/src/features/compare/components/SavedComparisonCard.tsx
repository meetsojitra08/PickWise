import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ComparisonShareControls } from '@/features/compare/components/ComparisonShareControls';
import { useCompare } from '@/features/compare/hooks/use-compare';
import { useDeleteComparison } from '@/features/compare/hooks/use-saved-comparisons';
import type { SavedComparison } from '@/features/compare/types/saved-comparison';

function formatSavedDate(createdAt: string | null): string | null {
  if (!createdAt) {
    return null;
  }

  const parsed = new Date(createdAt);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function SavedComparisonCard({
  comparison,
}: {
  comparison: SavedComparison;
}) {
  const { replace } = useCompare();
  const navigate = useNavigate();
  const deleteComparison = useDeleteComparison();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const savedDate = formatSavedDate(comparison.created_at);
  const category = comparison.items[0]?.category?.name;
  const meta = [
    `${comparison.item_count} ${comparison.item_count === 1 ? 'product' : 'products'}`,
    category,
    savedDate ? `Saved ${savedDate}` : null,
  ].filter(Boolean);

  function handleOpen(): void {
    if (comparison.items.length < 2) {
      toast.error('This comparison no longer has two available products.');
      return;
    }

    replace(comparison.items);
    navigate('/compare');
  }

  function handleDelete(): void {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    deleteComparison.mutate(comparison.id, {
      onSuccess: () => toast.success('Comparison deleted.'),
    });
  }

  return (
    <article className="rounded-card border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground">
            {comparison.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {meta.join(' · ')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={handleOpen}>
            Open comparison
          </Button>
          <Button
            type="button"
            variant={confirmingDelete ? 'destructive' : 'outline'}
            size="sm"
            disabled={deleteComparison.isPending}
            onClick={handleDelete}
          >
            {deleteComparison.isPending
              ? 'Deleting…'
              : confirmingDelete
                ? 'Confirm delete'
                : 'Delete'}
          </Button>
        </div>
      </div>

      {comparison.items.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {comparison.items.map((product) => (
            <li key={product.id}>
              <Link
                to={`/products/${product.slug}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {product.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {comparison.unavailable_count > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground" role="status">
          {comparison.unavailable_count}{' '}
          {comparison.unavailable_count === 1 ? 'product is' : 'products are'}{' '}
          no longer available and hidden from this comparison.
        </p>
      ) : null}

      <ComparisonShareControls comparison={comparison} />
    </article>
  );
}
