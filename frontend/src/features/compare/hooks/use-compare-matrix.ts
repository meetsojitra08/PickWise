import { useQuery } from '@tanstack/react-query';
import { postCompareMatrix } from '@/features/compare/api/compare-api';
import {
  MAX_COMPARE_ITEMS,
  MIN_COMPARE_ITEMS,
} from '@/features/compare/lib/compare-storage';

export const compareKeys = {
  all: ['compare'] as const,
  matrix: (productIds: number[]) =>
    [...compareKeys.all, 'matrix', productIds.join(',')] as const,
};

/**
 * Fetch the matrix for the current tray. Order is part of the query key because
 * the API preserves the shopper's column order.
 */
export function useCompareMatrix(productIds: number[]) {
  return useQuery({
    queryKey: compareKeys.matrix(productIds),
    queryFn: ({ signal }) => postCompareMatrix(productIds, signal),
    enabled:
      productIds.length >= MIN_COMPARE_ITEMS &&
      productIds.length <= MAX_COMPARE_ITEMS,
  });
}
