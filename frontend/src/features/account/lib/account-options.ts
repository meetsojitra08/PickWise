import type { AccountTabKey } from '../types/account';

export interface AccountOption {
  value: string;
  label: string;
}

export const DEFAULT_ACCOUNT_TAB: AccountTabKey = 'profile';
export const MAX_PRIORITIES = 5;

export const ACCOUNT_TABS: readonly {
  key: AccountTabKey;
  label: string;
}[] = [
  { key: 'wishlist', label: 'Wishlist' },
  { key: 'comparisons', label: 'Saved comparisons' },
  { key: 'conversations', label: 'Conversations' },
  { key: 'preferences', label: 'Preferences' },
  { key: 'profile', label: 'Profile' },
];

const VALID_TABS = new Set<AccountTabKey>(ACCOUNT_TABS.map((tab) => tab.key));

export function resolveAccountTab(rawTab: string | null): AccountTabKey {
  if (rawTab && VALID_TABS.has(rawTab as AccountTabKey)) {
    return rawTab as AccountTabKey;
  }

  return DEFAULT_ACCOUNT_TAB;
}

export const STARTER_CATEGORY_OPTIONS: readonly AccountOption[] = [
  { value: 'smartphones', label: 'Smartphones' },
  { value: 'laptops', label: 'Laptops' },
  { value: 'headphones', label: 'Headphones' },
  { value: 'monitors', label: 'Monitors' },
  { value: 'keyboards', label: 'Keyboards' },
  { value: 'smartwatches', label: 'Smartwatches' },
];

const VALID_CATEGORY_SLUGS = new Set(
  STARTER_CATEGORY_OPTIONS.map((option) => option.value),
);

export const PRIORITY_OPTIONS: readonly AccountOption[] = [
  { value: 'price', label: 'Price & value' },
  { value: 'battery', label: 'Battery life' },
  { value: 'performance', label: 'Performance' },
  { value: 'display', label: 'Display quality' },
  { value: 'portability', label: 'Portability' },
  { value: 'build quality', label: 'Build quality' },
  { value: 'camera', label: 'Camera' },
  { value: 'noise cancellation', label: 'Noise cancellation' },
];

export function filterValidCategorySlugs(
  slugs: readonly string[] | undefined,
): string[] {
  if (!slugs || slugs.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const valid: string[] = [];

  for (const slug of slugs) {
    const normalized = slug.trim().toLowerCase();

    if (VALID_CATEGORY_SLUGS.has(normalized) && !seen.has(normalized)) {
      seen.add(normalized);
      valid.push(normalized);
    }
  }

  return valid;
}

export function normalizePriorities(
  priorities: readonly string[] | undefined,
): string[] {
  if (!priorities || priorities.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of priorities) {
    const trimmed = item.trim();
    const key = trimmed.toLowerCase();

    if (trimmed.length >= 2 && !seen.has(key)) {
      seen.add(key);
      normalized.push(trimmed);

      if (normalized.length >= MAX_PRIORITIES) {
        break;
      }
    }
  }

  return normalized;
}

export function formatBudgetInput(budget: number | null | undefined): string {
  if (budget === null || budget === undefined) {
    return '';
  }

  return String(budget);
}

export function parseBudgetInput(rawValue: string): number | null {
  const trimmed = rawValue.trim();

  if (trimmed === '') {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
}

export function formatBudgetDisplay(budget: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: Number.isInteger(budget) ? 0 : 2,
  }).format(budget);
}

export function getCategoryLabel(slug: string): string {
  return (
    STARTER_CATEGORY_OPTIONS.find((option) => option.value === slug)?.label ??
    slug
  );
}

export function getPriorityLabel(priority: string): string {
  return (
    PRIORITY_OPTIONS.find(
      (option) => option.value.toLowerCase() === priority.toLowerCase(),
    )?.label ?? priority
  );
}
