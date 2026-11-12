import { useEffect, useMemo, useState } from 'react';
import { Dialog } from 'radix-ui';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCatalogProducts } from '@/features/catalog/hooks/use-catalog-data';
import { GlobalSearchResults } from './GlobalSearchResults';

export function GlobalSearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedQuery(query.trim()),
      250,
    );
    return () => window.clearTimeout(timeout);
  }, [query]);

  const searchParams = useMemo(
    () => ({ q: debouncedQuery, per_page: '6', sort: 'relevance' }),
    [debouncedQuery],
  );
  const productsQuery = useCatalogProducts(
    searchParams,
    `suggestions:${debouncedQuery}`,
    debouncedQuery.length >= 2,
  );
  const products = productsQuery.data?.data ?? [];

  const close = () => {
    setOpen(false);
    setQuery('');
    setDebouncedQuery('');
  };

  const submitSearch = (search: string) => {
    const value = search.trim();
    if (!value) return;
    close();
    void navigate(`/products?q=${encodeURIComponent(value)}`);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : close())}
    >
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label="Search products"
        >
          <Search className="size-4" strokeWidth={1.5} aria-hidden="true" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/30" />
        <Dialog.Content
          aria-describedby="global-search-description"
          className="fixed inset-x-3 top-[12vh] z-50 mx-auto max-h-[76vh] max-w-2xl overflow-y-auto rounded-surface border border-border bg-popover text-popover-foreground shadow-float outline-none sm:inset-x-6"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            document.getElementById('global-search-input')?.focus();
          }}
        >
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search
              className="size-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <label className="sr-only" htmlFor="global-search-input">
              Search products
            </label>
            <Input
              id="global-search-input"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitSearch(query);
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  document
                    .getElementById('global-search-suggestion-0')
                    ?.focus();
                }
              }}
              placeholder="Search products by name, brand, or category"
              className="h-14 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Close search"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <p id="global-search-description" className="sr-only">
            Search the catalog and open a product suggestion or all results.
          </p>
          <div
            className="p-3"
            aria-live="polite"
            aria-busy={debouncedQuery.length >= 2 && productsQuery.isPending}
          >
            <GlobalSearchResults
              products={products}
              hasQuery={debouncedQuery.length >= 2}
              isLoading={productsQuery.isPending}
              isError={productsQuery.isError}
              onRetry={() => void productsQuery.refetch()}
              onSelect={(product) => {
                close();
                void navigate(`/products/${encodeURIComponent(product.slug)}`);
              }}
            />
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Use Ctrl/⌘ + K to search
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!query.trim()}
              onClick={() => submitSearch(query)}
            >
              View all results
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
