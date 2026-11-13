import { useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useWishlistToggle } from '@/features/wishlist/hooks/use-wishlist';
import { takeWishlistIntents } from '@/features/wishlist/lib/pending-wishlist-intents';

/**
 * Saves the products a guest hearted before logging in. Mounted inside the
 * storefront layout, so it runs as soon as an authenticated page renders.
 */
export function WishlistIntentSync() {
  const { isAuthenticated } = useAuth();
  const { toggle } = useWishlistToggle();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    for (const product of takeWishlistIntents()) {
      toggle(product, true);
    }
  }, [isAuthenticated, toggle]);

  return null;
}
