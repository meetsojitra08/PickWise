import { useCallback } from 'react';
import { toast } from 'sonner';
import type { ProductSummary } from '@/features/catalog/types/catalog';
import { useCompare } from '@/features/compare/hooks/use-compare';
import { MAX_COMPARE_ITEMS } from '@/features/compare/lib/compare-storage';

/**
 * Add or remove a product while explaining the two rules the tray enforces:
 * a maximum of four products, all from one category.
 */
export function useCompareToggle() {
  const { toggle } = useCompare();

  const toggleCompare = useCallback(
    (product: ProductSummary) => {
      const result = toggle(product);

      if (result === 'limit_reached') {
        toast.error(
          `You can compare up to ${MAX_COMPARE_ITEMS} products. Remove one to add another.`,
        );
      }

      if (result === 'category_mismatch') {
        toast.error(
          'Compare products from the same category. Clear the tray to start a new comparison.',
        );
      }

      return result;
    },
    [toggle],
  );

  return { toggle: toggleCompare };
}
