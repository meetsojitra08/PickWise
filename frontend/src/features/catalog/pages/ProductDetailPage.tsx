import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { EmptyState } from '@/components/shared/EmptyState';
import { PriceTag } from '@/components/shared/PriceTag';
import { Button } from '@/components/ui/button';
import { ProductDetailSkeleton } from '@/features/catalog/components/ProductDetailSkeleton';
import { ProductFacts } from '@/features/catalog/components/ProductFacts';
import { ProductGallery } from '@/features/catalog/components/ProductGallery';
import { ProductPriceHistory } from '@/features/catalog/components/ProductPriceHistory';
import { ProductSimilarProducts } from '@/features/catalog/components/ProductSimilarProducts';
import { ProductSpecifications } from '@/features/catalog/components/ProductSpecifications';
import { useCatalogProduct } from '@/features/catalog/hooks/use-catalog-data';
import { useDeviceProductSelection } from '@/features/catalog/hooks/use-device-product-selection';
import type { ProductDetail } from '@/features/catalog/types/catalog-api';
import { isApiError } from '@/lib/api-error';

function ProductDetailContent({ product }: { product: ProductDetail }) {
  const selection = useDeviceProductSelection(product.id);
  const images = product.images.length
    ? product.images
    : product.primary_image
      ? [
          {
            ...product.primary_image,
            sort_order: 0,
            is_primary: true,
          },
        ]
      : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-32 sm:px-6 sm:py-10 md:pb-12">
      <Link
        to="/products"
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to products
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:gap-12">
        <ProductGallery name={product.name} images={images} />
        <ProductFacts
          product={product}
          isWishlisted={selection.isWishlisted}
          isCompared={selection.isCompared}
          onWishlistToggle={selection.toggleWishlist}
          onCompareToggle={selection.toggleCompare}
        />
      </div>

      <ProductSpecifications specs={product.specs} />
      <ProductPriceHistory slug={product.slug} />
      <ProductSimilarProducts slug={product.slug} />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <PriceTag
            price={product.price}
            size="default"
            className="min-w-0 flex-1"
          />
          {product.store_url ? (
            <Button asChild className="min-h-11 shrink-0">
              <a
                href={product.store_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on store <ExternalLink aria-hidden="true" />
              </a>
            </Button>
          ) : (
            <Button type="button" className="shrink-0" disabled>
              Unavailable
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductDetailRoute() {
  const { slug = '' } = useParams();
  const productQuery = useCatalogProduct(slug);

  if (productQuery.isPending) return <ProductDetailSkeleton />;
  if (
    productQuery.isError &&
    isApiError(productQuery.error) &&
    productQuery.error.status === 404
  ) {
    return (
      <EmptyState
        title="This product isn't available."
        description="It may have been removed or the link may be incorrect. Browse the catalog to find another option."
        actionLabel="Browse products"
        actionTo="/products"
      />
    );
  }
  if (productQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <EmptyState
          title="Product details could not load"
          description="Check your connection and try again."
          actionLabel="Try again"
          onAction={() => void productQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <ProductDetailContent
      key={productQuery.data.data.id}
      product={productQuery.data.data}
    />
  );
}
