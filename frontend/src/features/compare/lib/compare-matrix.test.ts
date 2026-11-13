import { describe, expect, it } from 'vitest';
import {
  formatCompareValue,
  rowHasDifferences,
} from '@/features/compare/lib/compare-matrix';
import type { CompareRow } from '@/features/compare/types/compare';

function buildRow(values: CompareRow['values']): CompareRow {
  return {
    key: 'spec',
    label: 'Spec',
    unit: null,
    data_type: 'text',
    higher_is_better: null,
    winner_product_id: null,
    values,
  };
}

describe('formatCompareValue', () => {
  it('labels missing values instead of leaving a blank cell', () => {
    expect(formatCompareValue(null)).toBe('Not listed');
    expect(formatCompareValue('')).toBe('Not listed');
  });

  it('formats booleans and numbers for scanning', () => {
    expect(formatCompareValue(true)).toBe('Yes');
    expect(formatCompareValue(false)).toBe('No');
    expect(formatCompareValue(16)).toBe('16');
    expect(formatCompareValue(1.5)).toBe('1.5');
    expect(formatCompareValue(12000)).toBe('12,000');
  });

  it('keeps text values as written', () => {
    expect(formatCompareValue('OLED')).toBe('OLED');
  });
});

describe('rowHasDifferences', () => {
  it('is true when any product value differs', () => {
    expect(
      rowHasDifferences(
        buildRow([
          { product_id: 1, value: 16 },
          { product_id: 2, value: 32 },
        ]),
      ),
    ).toBe(true);
  });

  it('treats a missing value as a difference', () => {
    expect(
      rowHasDifferences(
        buildRow([
          { product_id: 1, value: null },
          { product_id: 2, value: true },
        ]),
      ),
    ).toBe(true);
  });

  it('is false when all values match', () => {
    expect(
      rowHasDifferences(
        buildRow([
          { product_id: 1, value: 'IPS' },
          { product_id: 2, value: 'IPS' },
        ]),
      ),
    ).toBe(false);
  });
});
