import type { ProductSummary } from '@/features/catalog/types/catalog';

const STORAGE_KEY = 'pickwise:pending-wishlist';

function isStoredProduct(value: unknown): value is ProductSummary {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<ProductSummary>;

  return (
    typeof candidate.id === 'number' &&
    typeof candidate.name === 'string' &&
    typeof candidate.slug === 'string' &&
    typeof candidate.price === 'object' &&
    candidate.price !== null
  );
}

function readIntents(): ProductSummary[] {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];

    return Array.isArray(parsed) ? parsed.filter(isStoredProduct) : [];
  } catch {
    return [];
  }
}

/**
 * Guests can heart a product before they have an account. Keep the intent for
 * the rest of this tab so it can be saved once they log in.
 */
export function rememberWishlistIntent(product: ProductSummary): void {
  try {
    const next = [
      ...readIntents().filter((item) => item.id !== product.id),
      product,
    ];
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable; the heart simply waits for another click.
  }
}

export function takeWishlistIntents(): ProductSummary[] {
  const intents = readIntents();

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing else to clear when storage is unavailable.
  }

  return intents;
}
