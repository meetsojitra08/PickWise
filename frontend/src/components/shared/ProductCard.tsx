import { useState } from 'react';
import { Columns3, Heart, Package } from 'lucide-react';
import { Link } from 'react-router';
import { PriceTag } from '@/components/shared/PriceTag';
import { RatingStars } from '@/components/shared/RatingStars';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import type { ProductSummary } from '@/features/catalog/types/catalog';
import { cn } from '@/lib/utils';
import type { MoneyValue } from '@/types/api';

export interface ProductCardProps {
  product: ProductSummary;
  to?: string;
  previousPrice?: MoneyValue | null;
  showSummary?: boolean;
  isWishlisted?: boolean;
  wishlistPending?: boolean;
  onWishlistToggle?: (product: ProductSummary) => void;
  isCompared?: boolean;
  compareDisabled?: boolean;
  onCompareToggle?: (product: ProductSummary) => void;
  className?: string;
}

export function ProductCard({
  product,
  to,
  previousPrice = null,
  showSummary = true,
  isWishlisted = false,
  wishlistPending = false,
  onWishlistToggle,
  isCompared = false,
  compareDisabled = false,
  onCompareToggle,
  className,
}: ProductCardProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  const productHref = to ?? `/products/${product.slug}`;
  const imageUrl = product.primary_image?.url ?? null;
  const imageAlt = product.primary_image?.alt_text?.trim() || product.name;
  const showImage = imageUrl !== null && failedImageUrl !== imageUrl;
  const eyebrowLabel = product.brand?.name ?? product.category?.name ?? null;
  const hasActions =
    onWishlistToggle !== undefined || onCompareToggle !== undefined;
  const availabilityBadge =
    product.availability === 'out_of_stock'
      ? {
          variant: 'negative' as const,
          label: product.availability_label || 'Out of Stock',
        }
      : product.availability === 'low_stock'
        ? {
            variant: 'warning' as const,
            label: product.availability_label || 'Low Stock',
          }
        : null;

  return (
    <article className={cn('h-full', className)}>
      <Card
        size="sm"
        className="relative h-full justify-between transition-colors hover:border-primary/40"
      >
        <div className="flex flex-col gap-3">
          <div className="px-4">
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-media border border-border/70 bg-muted/40">
              {showImage ? (
                <img
                  src={imageUrl}
                  alt={imageAlt}
                  width={800}
                  height={600}
                  loading="lazy"
                  decoding="async"
                  onError={() => setFailedImageUrl(imageUrl)}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-2 bg-muted/60 px-4 text-center text-muted-foreground">
                  <Package
                    className="size-8 opacity-70"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <span className="text-xs">No photo available</span>
                </div>
              )}
            </div>
          </div>

          <CardContent className="gap-2">
            {eyebrowLabel || product.value_score !== null ? (
              <div className="flex min-h-6 items-center justify-between gap-2">
                <span className="truncate text-xs font-medium text-muted-foreground">
                  {eyebrowLabel ?? ''}
                </span>

                {product.value_score !== null ? (
                  <Badge
                    variant="accent"
                    aria-label={`Value score ${product.value_score} out of 100`}
                    title="It combines how comparable specs rank in this category (40%), rating confidence (30%), and spec strength for the price (30%). Lower-is-better specs are reversed; ratings use a 4-star baseline and five assumed reviews."
                    className="tabular-nums"
                  >
                    Value {product.value_score}
                  </Badge>
                ) : null}
              </div>
            ) : null}

            <h3 className="font-heading text-base leading-snug font-semibold text-foreground">
              <Link
                to={productHref}
                className="line-clamp-2 transition-colors after:absolute after:inset-0 group-hover/card:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {product.name}
              </Link>
            </h3>

            {showSummary && product.summary.trim() !== '' ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {product.summary}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <RatingStars
                rating={product.rating_avg}
                count={product.rating_count}
                size="sm"
              />

              {availabilityBadge ? (
                <Badge variant={availabilityBadge.variant}>
                  {availabilityBadge.label}
                </Badge>
              ) : null}
            </div>
          </CardContent>
        </div>

        <CardFooter className="items-center justify-between gap-2 border-t border-border/70 pt-3">
          <PriceTag
            price={product.price}
            previousPrice={previousPrice}
            size="sm"
            className="min-w-0 flex-1"
          />

          {hasActions ? (
            <div className="relative z-10 flex shrink-0 items-center gap-1">
              {onWishlistToggle ? (
                <Button
                  type="button"
                  variant={isWishlisted ? 'secondary' : 'ghost'}
                  size="icon-lg"
                  disabled={wishlistPending}
                  aria-pressed={isWishlisted}
                  aria-label={
                    isWishlisted
                      ? `Remove ${product.name} from wishlist`
                      : `Add ${product.name} to wishlist`
                  }
                  onClick={() => onWishlistToggle(product)}
                >
                  <Heart
                    className={cn(
                      'size-4',
                      isWishlisted
                        ? 'fill-negative text-negative'
                        : 'text-muted-foreground',
                    )}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </Button>
              ) : null}

              {onCompareToggle ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  disabled={compareDisabled && !isCompared}
                  aria-pressed={isCompared}
                  aria-label={
                    isCompared
                      ? `Remove ${product.name} from comparison`
                      : `Add ${product.name} to comparison`
                  }
                  className={cn(
                    isCompared
                      ? 'bg-primary/10 text-primary hover:bg-primary/15'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => onCompareToggle(product)}
                >
                  <Columns3
                    className="size-4"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardFooter>
      </Card>
    </article>
  );
}
