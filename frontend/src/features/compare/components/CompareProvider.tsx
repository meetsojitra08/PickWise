import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ProductSummary } from '@/features/catalog/types/catalog';
import {
  CompareContext,
  type CompareContextValue,
  type CompareToggleResult,
} from '@/features/compare/hooks/compare-context';
import {
  loadCompareItems,
  MAX_COMPARE_ITEMS,
  MIN_COMPARE_ITEMS,
  saveCompareItems,
} from '@/features/compare/lib/compare-storage';
import type { CompareItem } from '@/features/compare/types/compare';

function categoryIdOf(product: ProductSummary): number | null {
  return product.category?.id ?? null;
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>(loadCompareItems);

  useEffect(() => {
    saveCompareItems(items);
  }, [items]);

  const toggle = useCallback(
    (product: ProductSummary): CompareToggleResult => {
      if (items.some((item) => item.id === product.id)) {
        setItems(items.filter((item) => item.id !== product.id));
        return 'removed';
      }

      if (items.length >= MAX_COMPARE_ITEMS) {
        return 'limit_reached';
      }

      const currentCategoryId = items[0]
        ? categoryIdOf(items[0])
        : categoryIdOf(product);
      const nextCategoryId = categoryIdOf(product);

      if (
        currentCategoryId !== null &&
        nextCategoryId !== null &&
        currentCategoryId !== nextCategoryId
      ) {
        return 'category_mismatch';
      }

      setItems([...items, product]);
      return 'added';
    },
    [items],
  );

  const remove = useCallback((productId: number): void => {
    setItems((current) => current.filter((item) => item.id !== productId));
  }, []);

  const clear = useCallback((): void => {
    setItems([]);
  }, []);

  const selectedIds = useMemo(
    () => new Set(items.map((item) => item.id)),
    [items],
  );

  const value = useMemo<CompareContextValue>(
    () => ({
      items,
      selectedIds,
      count: items.length,
      isFull: items.length >= MAX_COMPARE_ITEMS,
      canCompare: items.length >= MIN_COMPARE_ITEMS,
      toggle,
      remove,
      clear,
    }),
    [items, selectedIds, toggle, remove, clear],
  );

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  );
}
