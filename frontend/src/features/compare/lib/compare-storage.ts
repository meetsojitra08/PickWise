import type { CompareItem } from '@/features/compare/types/compare';

export const COMPARE_STORAGE_KEY = 'pickwise:compare';
export const MIN_COMPARE_ITEMS = 2;
export const MAX_COMPARE_ITEMS = 4;

function isCompareItem(value: unknown): value is CompareItem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as {
    id?: unknown;
    name?: unknown;
    slug?: unknown;
  };

  return (
    typeof candidate.id === 'number' &&
    typeof candidate.name === 'string' &&
    typeof candidate.slug === 'string'
  );
}

/**
 * Read the tray from this device and discard anything malformed or over the cap.
 * Older versions stored bare product ids under the same key; those are ignored.
 */
export function loadCompareItems(): CompareItem[] {
  try {
    const stored = window.localStorage.getItem(COMPARE_STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const seenIds = new Set<number>();
    const items: CompareItem[] = [];

    for (const value of parsed) {
      if (!isCompareItem(value) || seenIds.has(value.id)) {
        continue;
      }

      seenIds.add(value.id);
      items.push(value);

      if (items.length === MAX_COMPARE_ITEMS) {
        break;
      }
    }

    return items;
  } catch {
    return [];
  }
}

export function saveCompareItems(items: CompareItem[]): void {
  try {
    window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // The tray still works for this visit when browser storage is unavailable.
  }
}
