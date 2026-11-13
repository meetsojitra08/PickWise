import { Heart } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { ProductCard } from '@/components/shared/ProductCard';
import { ProductGridSkeleton } from '@/components/shared/ProductGridSkeleton';
import { Button } from '@/components/ui/button';
import {
  useWishlist,
  useWishlistToggle,
} from '@/features/wishlist/hooks/use-wishlist';

export function WishlistTab() {
  const wishlist = useWishlist();
  const { toggle, isToggling } = useWishlistToggle();
  const products = wishlist.items.flatMap((item) =>
    item.product ? [item.product] : [],
  );

  if (wishlist.isPending) {
    return (
      <ProductGridSkeleton
        count={3}
        showActions
        label="Loading your wishlist"
        className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"
      />
    );
  }

  if (wishlist.isError) {
    return (
      <EmptyState
        title="Your wishlist could not load"
        description="Check your connection and try again."
        actionLabel="Try again"
        onAction={() => void wishlist.refetch()}
        icon={<Heart className="size-5" strokeWidth={1.5} aria-hidden="true" />}
      />
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title="Your wishlist is empty"
        description="Heart a product to keep it here."
        actionLabel="Browse products"
        actionTo="/products"
        icon={<Heart className="size-5" strokeWidth={1.5} aria-hidden="true" />}
      />
    );
  }

  return (
    <section aria-labelledby="wishlist-heading">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="wishlist-heading"
          className="font-heading text-2xl font-semibold tracking-tight"
        >
          Saved products
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {wishlist.total} saved {wishlist.total === 1 ? 'product' : 'products'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isWishlisted
            showAvailability
            wishlistPending={wishlist.isFetching || isToggling(product.id)}
            onWishlistToggle={() => toggle(product, false)}
          />
        ))}
      </div>

      {wishlist.hasNextPage ? (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={wishlist.isFetchingNextPage}
            onClick={() => void wishlist.fetchNextPage()}
          >
            {wishlist.isFetchingNextPage ? 'Loading…' : 'Load more saves'}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
