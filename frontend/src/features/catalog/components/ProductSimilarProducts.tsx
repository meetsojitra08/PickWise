import { EmptyState } from '@/components/shared/EmptyState';
import { ProductCard } from '@/components/shared/ProductCard';
import { ProductCardSkeleton } from '@/components/shared/ProductCardSkeleton';
import { useCatalogSimilarProducts } from '@/features/catalog/hooks/use-catalog-data';

export function ProductSimilarProducts({ slug }: { slug: string }) {
  const similarQuery = useCatalogSimilarProducts(slug);

  return (
    <section className="mt-12" aria-labelledby="similar-products-heading">
      <div className="mb-5">
        <h2
          id="similar-products-heading"
          className="font-heading text-2xl font-semibold tracking-tight"
        >
          Similar products
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          More options from this category with comparable specs and prices.
        </p>
      </div>

      {similarQuery.isPending ? (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          role="status"
          aria-label="Loading similar products"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      ) : similarQuery.isError ? (
        <EmptyState
          title="Similar products could not load"
          description="Check your connection and try again."
          actionLabel="Try again"
          onAction={() => void similarQuery.refetch()}
        />
      ) : similarQuery.data.data.length === 0 ? (
        <EmptyState
          title="No similar products yet"
          description="There are no close matches in this category right now."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {similarQuery.data.data.map((similarProduct) => (
            <ProductCard key={similarProduct.id} product={similarProduct} />
          ))}
        </div>
      )}
    </section>
  );
}
