import type {
  CompareRow,
  CompareValue,
} from '@/features/compare/types/compare';

const NUMBER_FORMATTER = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 4,
});

/**
 * Format a matrix value for the table. Missing values say “Not listed” so a
 * cell is never blank, and booleans read as words rather than raw JSON.
 */
export function formatCompareValue(value: CompareValue): string {
  if (value === null || value === '') {
    return 'Not listed';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'number') {
    return NUMBER_FORMATTER.format(value);
  }

  return value;
}

/**
 * A row matters when at least one product's value differs from the first one.
 * Missing values count as differences because “Not listed” is information too.
 */
export function rowHasDifferences(row: CompareRow): boolean {
  if (row.values.length < 2) {
    return false;
  }

  const [first, ...rest] = row.values;

  return rest.some((entry) => entry.value !== first.value);
}
