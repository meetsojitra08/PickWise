import { useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Columns3,
  Heart,
  Minus,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router';
import { PriceTag } from '@/components/shared/PriceTag';
import { RatingStars } from '@/components/shared/RatingStars';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { useCompare } from '@/features/compare/hooks/use-compare';
import { useCompareToggle } from '@/features/compare/hooks/use-compare-toggle';
import {
  useWishlist,
  useWishlistToggle,
} from '@/features/wishlist/hooks/use-wishlist';
import { cn } from '@/lib/utils';
import type { AssistantRecommendationItem } from '../types/assistant';

interface AssistantRecommendationCardProps {
  recommendation: AssistantRecommendationItem;
  variant?: 'recommendation' | 'alternative' | 'fallback';
  className?: string;
}

export function AssistantRecommendationCard({
  recommendation,
  variant = 'recommendation',
  className,
}: AssistantRecommendationCardProps) {
  const product = recommendation.product;
  const [imageError, setImageError] = useState(false);

  const { selectedIds } = useCompare();
  const { toggle: toggleCompare } = useCompareToggle();
  const { savedIds } = useWishlist();
  const { toggle: toggleWishlist, isToggling } = useWishlistToggle();

  if (!product) {
    return null;
  }

  const isCompared = selectedIds.has(product.id);
  const isWishlisted = savedIds.has(product.id);
  const wishlistPending = isToggling(product.id);

  const badgeConfig =
    variant === 'alternative'
      ? { label: 'Alternative (over budget)', variant: 'warning' as const }
      : variant === 'fallback'
        ? { label: 'Catalog match', variant: 'secondary' as const }
        : { label: 'AI pick', variant: 'accent' as const };

  const imageUrl = product.primary_image?.url ?? null;
  const imageAlt = product.primary_image?.alt_text?.trim() || product.name;
  const showImage = imageUrl !== null && !imageError;

  return (
    <Card
      className={cn(
        'group flex flex-col justify-between border-l-4 border-l-accent bg-card transition-all hover:border-primary/50 hover:shadow-md dark:bg-card/90',
        className,
      )}
    >
      <div>
        {/* Card Header & Badge Row */}
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge
              variant={badgeConfig.variant}
              className="font-semibold text-[11px]"
            >
              {badgeConfig.label}
            </Badge>

            {product.value_score !== null &&
              product.value_score !== undefined && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 text-[11px] font-bold tabular-nums text-foreground"
                  title="Pickwise Value Score"
                >
                  <ShieldCheck className="size-3 text-accent" />
                  Value Score: {product.value_score}
                </span>
              )}
          </div>

          {/* Product Hero: Image + Details */}
          <div className="mt-3 flex items-start gap-3.5">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-muted/40 shadow-2xs">
              {showImage ? (
                <img
                  src={imageUrl}
                  alt={imageAlt}
                  width={80}
                  height={80}
                  onError={() => setImageError(true)}
                  className="size-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <Package className="size-7 opacity-50" aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {product.brand?.name ?? product.category?.name ?? ''}
              </span>
              <h3 className="line-clamp-2 text-sm font-bold text-foreground leading-snug">
                <Link
                  to={`/products/${product.slug}`}
                  className="hover:text-primary transition-colors"
                >
                  {product.name}
                </Link>
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2.5">
                <PriceTag
                  price={product.price}
                  className="text-base font-bold text-primary"
                />
                {product.rating_avg !== null && (
                  <RatingStars
                    rating={product.rating_avg}
                    count={product.rating_count}
                    size="sm"
                  />
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Card Content: Why it fits & Trade-offs */}
        <CardContent className="space-y-2.5 p-4 pt-1 text-xs">
          {recommendation.reason && (
            <div className="rounded-lg border border-positive/20 bg-positive-subtle/50 dark:bg-positive/10 p-2.5">
              <div className="flex items-center gap-1.5 font-heading text-[11px] font-bold text-positive uppercase tracking-wide">
                <Check className="size-3.5 stroke-[2.5]" aria-hidden="true" />
                <h4>Why it fits</h4>
              </div>
              <p className="mt-1 pl-5 text-foreground leading-relaxed text-xs">
                {recommendation.reason}
              </p>
            </div>
          )}

          {recommendation.tradeoffs.length > 0 && (
            <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5">
              <div className="flex items-center gap-1.5 font-heading text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                <Minus
                  className="size-3.5 stroke-[2.5] text-negative"
                  aria-hidden="true"
                />
                <h4>Trade-offs</h4>
              </div>
              <ul className="mt-1 pl-5 space-y-1 text-foreground leading-relaxed text-xs">
                {recommendation.tradeoffs.map((tradeoff, index) => (
                  <li
                    key={`${tradeoff}-${index}`}
                    className="list-disc list-outside"
                  >
                    <span>{tradeoff}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </div>

      {/* Card Footer: Actions */}
      <CardFooter className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/15 p-3 px-4">
        <Button
          asChild
          variant="default"
          size="sm"
          className="h-8 gap-1 text-xs font-semibold"
        >
          <Link to={`/products/${product.slug}`}>
            <span>View product</span>
            <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant={isCompared ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => toggleCompare(product)}
            aria-pressed={isCompared}
            className="h-8 gap-1 text-xs"
            title={isCompared ? 'In compare tray' : 'Add to compare tray'}
          >
            <Columns3
              className={cn(
                'size-3.5',
                isCompared ? 'text-primary' : 'text-muted-foreground',
              )}
              aria-hidden="true"
            />
            <span>{isCompared ? 'Comparing' : 'Compare'}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={wishlistPending}
            onClick={() => toggleWishlist(product, !isWishlisted)}
            aria-label={
              isWishlisted
                ? `Remove ${product.name} from wishlist`
                : `Save ${product.name} to wishlist`
            }
            className="h-8 w-8 p-0"
            title={isWishlisted ? 'Saved to wishlist' : 'Save to wishlist'}
          >
            <Heart
              className={cn(
                'size-4',
                isWishlisted
                  ? 'fill-accent text-accent'
                  : 'text-muted-foreground group-hover:text-foreground',
              )}
              aria-hidden="true"
            />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
