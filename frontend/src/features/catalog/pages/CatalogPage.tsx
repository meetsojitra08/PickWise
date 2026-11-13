import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { EmptyState } from '@/components/shared/EmptyState';
import { ProductCard } from '@/components/shared/ProductCard';
import { ProductGridSkeleton } from '@/components/shared/ProductGridSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { FilterPanel } from '@/features/catalog/components/FilterPanel';
import {
  useCatalogCategories,
  useCatalogFacets,
  useCatalogProducts,
} from '@/features/catalog/hooks/use-catalog-data';
import type {
  CatalogCategory,
  CatalogSpecFacet,
} from '@/features/catalog/types/catalog-api';
import { useCompare } from '@/features/compare/hooks/use-compare';
import { useCompareToggle } from '@/features/compare/hooks/use-compare-toggle';
import {
  useWishlist,
  useWishlistToggle,
} from '@/features/wishlist/hooks/use-wishlist';

function flattenCategories(categories: CatalogCategory[]): CatalogCategory[] {
  return categories.flatMap((category) => [
    category,
    ...flattenCategories(category.children ?? []),
  ]);
}

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const categoriesQuery = useCatalogCategories();
  const paramsKey = searchParams.toString();
  const stableSearchParams = useMemo(
    () => new URLSearchParams(paramsKey),
    [paramsKey],
  );
  const requestParams = useMemo(() => {
    const result: Record<string, string | string[]> = {};
    const brands = stableSearchParams
      .getAll('brand[]')
      .concat(stableSearchParams.getAll('brand'));
    for (const [key, value] of stableSearchParams.entries()) {
      if (key === 'brand[]' || key === 'brand') continue;
      result[key] = value;
    }
    if (brands.length) result.brand = [...new Set(brands)];
    if (!result.per_page) result.per_page = '24';
    return result;
  }, [stableSearchParams]);
  const productsQuery = useCatalogProducts(requestParams, paramsKey);
  const wishlist = useWishlist();
  const { toggle: toggleWishlist, isToggling } = useWishlistToggle();
  const compare = useCompare();
  const { toggle: toggleCompare } = useCompareToggle();
  const category = searchParams.get('category') ?? '';
  const facetsQuery = useCatalogFacets(category);
  const categories = useMemo(
    () => categoriesQuery.data?.data ?? [],
    [categoriesQuery.data],
  );
  const products = productsQuery.data?.data ?? [];
  const total = productsQuery.data?.meta.total ?? 0;
  const currentPage =
    productsQuery.data?.meta.current_page ??
    Number(searchParams.get('page') ?? 1);
  const lastPage = productsQuery.data?.meta.last_page ?? 1;
  const flatCategories = useMemo(
    () => flattenCategories(categories),
    [categories],
  );

  const updateFilter = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (key.startsWith('brand:')) {
      const slug = key.slice('brand:'.length);
      const brands = next
        .getAll('brand[]')
        .concat(next.getAll('brand'))
        .filter((brand) => brand !== slug);
      if (value) brands.push(value);
      next.delete('brand');
      next.delete('brand[]');
      for (const brand of [...new Set(brands)]) next.append('brand[]', brand);
    } else if (value === null) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const changePage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    if (page <= 1) next.delete('page');
    else next.set('page', String(page));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () =>
    setSearchParams(new URLSearchParams(), { replace: true });
  const activeFilters = getActiveFilters(
    searchParams,
    flatCategories,
    facetsQuery.data?.data.specs ?? [],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 max-w-3xl">
        <p className="text-sm font-medium text-primary">Product catalog</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Find the right fit
        </h1>
        <p className="mt-3 text-muted-foreground">
          Search and filter published products to find your next pick.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="catalog-search" className="sr-only">
          Search products
        </label>
        <Input
          id="catalog-search"
          type="search"
          placeholder="Search products…"
          value={searchParams.get('q') ?? ''}
          onChange={(event) => updateFilter('q', event.target.value || null)}
          className="sm:max-w-md"
        />
        <div className="flex items-center gap-2 sm:ml-auto">
          <label
            htmlFor="catalog-sort"
            className="shrink-0 text-sm text-muted-foreground"
          >
            Sort by
          </label>
          <select
            id="catalog-sort"
            aria-label="Sort products"
            value={
              searchParams.get('sort') ??
              (searchParams.has('q') ? 'relevance' : 'value')
            }
            onChange={(event) => updateFilter('sort', event.target.value)}
            className="h-11 min-w-40 rounded-control border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <option value="relevance">Relevance</option>
            <option value="value">Best value</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="rating">Top rated</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {productsQuery.isPending
            ? 'Loading products…'
            : `${total.toLocaleString()} ${total === 1 ? 'product' : 'products'}`}
        </p>
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" className="md:hidden">
              <SlidersHorizontal aria-hidden="true" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[88dvh] overflow-y-auto rounded-t-surface"
          >
            <SheetHeader>
              <SheetTitle>Filter products</SheetTitle>
              <SheetDescription>Choose what matters to you.</SheetDescription>
            </SheetHeader>
            <div className="px-5 pb-5">
              <FilterPanel
                categories={categories}
                facets={facetsQuery.data?.data}
                params={searchParams}
                onChange={updateFilter}
              />
            </div>
            <div className="sticky bottom-0 flex gap-2 border-t border-border bg-card p-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={clearFilters}
              >
                Clear all
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={() => setFiltersOpen(false)}
              >
                Show {total} results
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {activeFilters.length ? (
        <div
          className="mb-5 flex flex-wrap items-center gap-2"
          aria-label="Applied filters"
        >
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => updateFilter(filter.key, null)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {filter.label}
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ))}
          <Button type="button" variant="link" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      ) : null}

      <div className="grid gap-8 md:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="hidden md:block">
          <div className="sticky top-6 rounded-card border border-border bg-card p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-semibold">Filters</h2>
              {activeFilters.length ? (
                <button
                  type="button"
                  className="text-xs text-primary underline-offset-4 hover:underline"
                  onClick={clearFilters}
                >
                  Clear all
                </button>
              ) : null}
            </div>
            <FilterPanel
              categories={categories}
              facets={facetsQuery.data?.data}
              params={searchParams}
              onChange={updateFilter}
            />
          </div>
        </aside>
        <section
          aria-label="Catalog results"
          aria-busy={productsQuery.isPending}
        >
          {productsQuery.isPending ? (
            <ProductGridSkeleton count={8} />
          ) : productsQuery.isError ? (
            <EmptyState
              title="Products could not load"
              description="Check your connection and try again."
              actionLabel="Try again"
              onAction={() => void productsQuery.refetch()}
            />
          ) : products.length === 0 ? (
            <EmptyState
              title="No products match these filters"
              description="Clear a filter or widen the price range to see more options."
              actionLabel="Clear all filters"
              onAction={clearFilters}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isWishlisted={wishlist.savedIds.has(product.id)}
                    wishlistPending={
                      wishlist.isFetching || isToggling(product.id)
                    }
                    onWishlistToggle={(item) =>
                      toggleWishlist(item, !wishlist.savedIds.has(item.id))
                    }
                    isCompared={compare.selectedIds.has(product.id)}
                    compareDisabled={compare.isFull}
                    onCompareToggle={toggleCompare}
                  />
                ))}
              </div>
              {lastPage > 1 ? (
                <nav
                  aria-label="Catalog pagination"
                  className="mt-8 flex items-center justify-center gap-4"
                >
                  <Button
                    type="button"
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() => changePage(currentPage - 1)}
                  >
                    <ChevronLeft aria-hidden="true" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {lastPage}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={currentPage >= lastPage}
                    onClick={() => changePage(currentPage + 1)}
                  >
                    Next
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </nav>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function getActiveFilters(
  params: URLSearchParams,
  categories: CatalogCategory[],
  specs: CatalogSpecFacet[],
) {
  const filters: Array<{ key: string; label: string }> = [];
  const category = categories.find(
    (item) => item.slug === params.get('category'),
  );
  if (category) filters.push({ key: 'category', label: category.name });
  if (params.has('q'))
    filters.push({ key: 'q', label: `Search: ${params.get('q')}` });
  for (const [key, label] of [
    ['price_min', 'Min price'],
    ['price_max', 'Max price'],
    ['rating_min', 'Rating'],
    ['availability', 'Availability'],
  ] as const) {
    const value = params.get(key);
    if (value) filters.push({ key, label: `${label}: ${value}` });
  }
  for (const brand of params.getAll('brand[]').concat(params.getAll('brand')))
    filters.push({ key: `brand:${brand}`, label: brand.replaceAll('-', ' ') });
  for (const [key, value] of params.entries()) {
    const match = /^spec\[(.+)\]$/.exec(key);
    if (!match) continue;
    const facet = specs.find((spec) => spec.key === match[1]);
    const option = facet?.options?.find((item) => String(item.value) === value);
    filters.push({
      key,
      label: `${facet?.label ?? match[1]}: ${option?.label ?? value}`,
    });
  }
  return filters;
}
