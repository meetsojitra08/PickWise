import { createContext } from 'react';
import type { ProductSummary } from '@/features/catalog/types/catalog';
import type { CompareItem } from '@/features/compare/types/compare';

export type CompareToggleResult =
  'added' | 'removed' | 'limit_reached' | 'category_mismatch';

export interface CompareContextValue {
  items: CompareItem[];
  selectedIds: Set<number>;
  count: number;
  isFull: boolean;
  canCompare: boolean;
  toggle: (product: ProductSummary) => CompareToggleResult;
  remove: (productId: number) => void;
  clear: () => void;
}

export const CompareContext = createContext<CompareContextValue | null>(null);
