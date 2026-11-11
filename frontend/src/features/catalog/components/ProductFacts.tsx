import { Check, Columns3, ExternalLink, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PriceTag } from '@/components/shared/PriceTag';
import { RatingStars } from '@/components/shared/RatingStars';
import type { ProductDetail } from '@/features/catalog/types/catalog-api';

interface ProductFactsProps {
  product: ProductDetail;
  isWishlisted: boolean;
  isCompared: boolean;
  onWishlistToggle: () => void;
  onCompareToggle: () => void;
}

function availabilityVariant(product: ProductDetail) {
  if (product.availability === 'out_of_stock') return 'negative';
  if (product.availability === 'low_stock') return 'warning';
  return 'positive';
}

export function ProductFacts({
  product,
  isWishlisted,
  isCompared,
  onWishlistToggle,
  onCompareToggle,
}: ProductFactsProps) {
  return (
    <section className="min-w-0 lg:sticky lg:top-6 lg:self-start">
      <div className="flex flex-wrap items-center gap-2">
        {product.brand ? (
          <span className="text-sm font-medium text-muted-foreground">
            {product.brand.name}
          </span>
        ) : null}
        {product.category ? (
          <Badge variant="outline">{product.category.name}</Badge>
        ) : null}
      </div>
      <h1 className="mt-3 font-heading text-3xl leading-tight font-semibold tracking-tight text-foreground sm:text-4xl">
        {product.name}
      </h1>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <RatingStars rating={product.rating_avg} count={product.rating_count} />
        {product.value_score !== null ? (
          <button
            type="button"
            title="Value Score blends category-relative spec strength (40%), rating confidence (30%), and price efficiency (30%)."
            aria-label={`Value score ${product.value_score} out of 100. It blends category-relative spec strength (40%), rating confidence (30%), and price efficiency (30%).`}
            className="inline-flex min-h-8 cursor-help items-center gap-1.5 rounded-full bg-accent/20 px-3 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Value score{' '}
            <strong className="tabular-nums">{product.value_score}</strong>
          </button>
        ) : null}
      </div>

      {product.summary.trim() ? (
        <p className="mt-5 max-w-prose text-base leading-relaxed text-muted-foreground">
          {product.summary}
        </p>
      ) : null}
      {product.description?.trim() ? (
        <p className="mt-3 max-w-prose whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {product.description}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <PriceTag price={product.price} size="lg" />
        <Badge variant={availabilityVariant(product)}>
          {product.availability_label || 'Availability unknown'}
        </Badge>
      </div>

      <div className="mt-6 hidden gap-3 md:flex">
        {product.store_url ? (
          <Button asChild size="lg" className="flex-1">
            <a
              href={product.store_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on store
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        ) : (
          <Button size="lg" className="flex-1" disabled>
            Store link unavailable
          </Button>
        )}
        <Button
          type="button"
          variant={isWishlisted ? 'secondary' : 'outline'}
          size="icon-lg"
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={isWishlisted}
          onClick={onWishlistToggle}
        >
          <Heart
            className={isWishlisted ? 'fill-negative text-negative' : ''}
            aria-hidden="true"
          />
        </Button>
        <Button
          type="button"
          variant={isCompared ? 'secondary' : 'outline'}
          size="icon-lg"
          aria-label={
            isCompared ? 'Remove from comparison' : 'Add to comparison'
          }
          aria-pressed={isCompared}
          onClick={onCompareToggle}
        >
          {isCompared ? (
            <Check aria-hidden="true" />
          ) : (
            <Columns3 aria-hidden="true" />
          )}
        </Button>
      </div>
      <p className="mt-3 hidden text-xs text-muted-foreground md:block">
        Wishlist and comparison selections are saved on this device.
      </p>
    </section>
  );
}
