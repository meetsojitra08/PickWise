import type { UserPreferences } from '@/features/auth/types/auth';
import {
  filterValidCategorySlugs,
  formatBudgetDisplay,
  getCategoryLabel,
  getPriorityLabel,
  normalizePriorities,
} from '../lib/account-options';

interface PreferencesSummaryProps {
  preferences: UserPreferences | null;
}

export function PreferencesSummary({ preferences }: PreferencesSummaryProps) {
  const budget = preferences?.budget_default ?? null;
  const categories = filterValidCategorySlugs(
    preferences?.favourite_categories,
  );
  const priorities = normalizePriorities(preferences?.priorities);

  const hasSavedPreferences =
    budget !== null || categories.length > 0 || priorities.length > 0;

  return (
    <div className="rounded-control border border-border bg-muted/40 p-4">
      <p className="text-sm font-medium text-foreground">
        Saved assistant defaults
      </p>

      {!hasSavedPreferences ? (
        <p className="mt-1 text-sm text-muted-foreground">
          No default preferences saved yet. Set a budget, categories, or
          priorities below to pre-fill assistant searches.
        </p>
      ) : (
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Default budget</dt>
            <dd className="mt-0.5 font-medium text-foreground tabular-nums">
              {budget !== null ? formatBudgetDisplay(budget) : 'Not set'}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-muted-foreground">
              Favourite categories
            </dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {categories.length > 0
                ? categories.map(getCategoryLabel).join(', ')
                : 'None selected'}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-muted-foreground">Top priorities</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {priorities.length > 0
                ? priorities.map(getPriorityLabel).join(', ')
                : 'None selected'}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
