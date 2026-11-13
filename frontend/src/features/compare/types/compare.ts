import type { ProductSummary } from '@/features/catalog/types/catalog';
import type { ApiSuccessResponse } from '@/types/api';

/** A product kept in the device-local compare tray. */
export type CompareItem = ProductSummary;

export type CompareValue = string | number | boolean | null;

export interface CompareCategory {
  id: number;
  name: string;
  slug: string;
}

export interface CompareRowValue {
  product_id: number;
  value: CompareValue;
}

export interface CompareRow {
  key: string;
  label: string;
  unit: string | null;
  data_type: 'number' | 'text' | 'boolean';
  higher_is_better: boolean | null;
  winner_product_id: number | null;
  values: CompareRowValue[];
}

export interface CompareMatrixData {
  category: CompareCategory;
  products: ProductSummary[];
  rows: CompareRow[];
}

export type CompareMatrixResponse = ApiSuccessResponse<CompareMatrixData>;
