import { Button } from '@/components/ui/button';
import { PriceTag } from '@/components/shared/PriceTag';
import type { ProductSummary } from '@/features/catalog/types/catalog';

interface GlobalSearchResultsProps {
  products: ProductSummary[];
  hasQuery: boolean;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelect: (product: ProductSummary) => void;
}

export function GlobalSearchResults({
  products,
  hasQuery,
  isLoading,
  isError,
  onRetry,
  onSelect,
}: GlobalSearchResultsProps) {
  if (!hasQuery) {
    return (
      <p className="px-3 py-5 text-sm text-muted-foreground">
        Type at least two characters to see product suggestions.
      </p>
    );
  }
  if (isLoading) {
    return (
      <p className="px-3 py-5 text-sm text-muted-foreground">
        Searching products…
      </p>
    );
  }
  if (isError) {
    return (
      <div className="px-3 py-5 text-sm">
        <p className="text-negative">Suggestions could not load.</p>
        <Button
          type="button"
          variant="link"
          className="mt-1 h-auto p-0"
          onClick={onRetry}
        >
          Try again
        </Button>
      </div>
    );
  }
  if (products.length === 0) {
    return (
      <p className="px-3 py-5 text-sm text-muted-foreground">
        No products found. Try another search.
      </p>
    );
  }

  return (
    <ul aria-label="Product suggestions" className="space-y-1">
      {products.map((product, index) => (
        <li key={product.id}>
          <button
            id={`global-search-suggestion-${index}`}
            type="button"
            onClick={() => onSelect(product)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
              event.preventDefault();
              const nextIndex = index + (event.key === 'ArrowDown' ? 1 : -1);
              if (nextIndex < 0) {
                document.getElementById('global-search-input')?.focus();
              } else {
                document
                  .getElementById(`global-search-suggestion-${nextIndex}`)
                  ?.focus();
              }
            }}
            className="flex min-h-14 w-full items-center justify-between gap-4 rounded-control px-3 py-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {product.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {[product.brand?.name, product.category?.name]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
            <PriceTag price={product.price} className="shrink-0" />
          </button>
        </li>
      ))}
    </ul>
  );
}
