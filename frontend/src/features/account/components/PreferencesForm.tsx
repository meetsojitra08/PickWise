import { useId, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { FormStatusBanner } from '@/components/shared/FormStatusBanner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { User, UserPreferences } from '@/features/auth/types/auth';
import { applyApiFormErrors } from '@/lib/form-errors';
import { useUpdatePreferencesMutation } from '../hooks/use-account-mutations';
import {
  filterValidCategorySlugs,
  formatBudgetInput,
  normalizePriorities,
  parseBudgetInput,
} from '../lib/account-options';
import {
  preferencesFormSchema,
  type PreferencesFormValues,
} from '../schemas/account-schemas';
import { CategorySelector } from './CategorySelector';
import { PreferencesSummary } from './PreferencesSummary';
import { PrioritySelector } from './PrioritySelector';

const PREFERENCE_FIELDS = [
  'budget_default',
  'favourite_categories',
  'priorities',
] as const;

const EMPTY_PREFERENCES_VALUES: PreferencesFormValues = {
  budget_default: '',
  favourite_categories: [],
  priorities: [],
};

function toFormValues(
  preferences: UserPreferences | null | undefined,
): PreferencesFormValues {
  return {
    budget_default: formatBudgetInput(preferences?.budget_default),
    favourite_categories: filterValidCategorySlugs(
      preferences?.favourite_categories,
    ),
    priorities: normalizePriorities(preferences?.priorities),
  };
}

interface PreferencesFormProps {
  user: User;
}

export function PreferencesForm({ user }: PreferencesFormProps) {
  const { mutateAsync: submitPreferences } = useUpdatePreferencesMutation();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const submittingRef = useRef(false);

  const budgetId = useId();
  const budgetHintId = useId();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues: toFormValues(user.preferences),
  });

  const [watchedBudget, watchedCategories, watchedPriorities] = useWatch({
    control,
    name: ['budget_default', 'favourite_categories', 'priorities'],
  });

  const isBusy = isSubmitting || isClearing;
  const hasAnythingToClear =
    Boolean(user.preferences) ||
    (watchedBudget ?? '').trim() !== '' ||
    (watchedCategories?.length ?? 0) > 0 ||
    (watchedPriorities?.length ?? 0) > 0;

  async function onSubmit(values: PreferencesFormValues): Promise<void> {
    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setFormError(null);
    setStatusMessage(null);

    try {
      const updatedUser = await submitPreferences({
        budget_default: parseBudgetInput(values.budget_default),
        favourite_categories: filterValidCategorySlugs(
          values.favourite_categories,
        ),
        priorities: normalizePriorities(values.priorities),
      });

      reset(toFormValues(updatedUser.preferences));
      setStatusMessage(
        updatedUser.preferences ? 'Preferences saved.' : 'Preferences cleared.',
      );
    } catch (error: unknown) {
      setFormError(applyApiFormErrors(error, setError, PREFERENCE_FIELDS));
    } finally {
      submittingRef.current = false;
    }
  }

  async function handleClearPreferences(): Promise<void> {
    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setIsClearing(true);
    setFormError(null);
    setStatusMessage(null);

    try {
      await submitPreferences({
        budget_default: null,
        favourite_categories: [],
        priorities: [],
      });
      reset(EMPTY_PREFERENCES_VALUES);
      setStatusMessage('Preferences cleared.');
    } catch (error: unknown) {
      setFormError(applyApiFormErrors(error, setError, PREFERENCE_FIELDS));
    } finally {
      setIsClearing(false);
      submittingRef.current = false;
    }
  }

  const budgetDescribedBy = errors.budget_default
    ? `${budgetHintId} ${budgetId}-error`
    : budgetHintId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-xl font-semibold text-foreground">
            Shopping preferences
          </h2>
        </CardTitle>
        <CardDescription>
          Save your usual budget and priorities so the shopping assistant starts
          with relevant context.
        </CardDescription>
      </CardHeader>

      <CardContent className="gap-6">
        <PreferencesSummary preferences={user.preferences} />

        <form
          noValidate
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
          className="flex flex-col gap-6"
        >
          <FormStatusBanner variant="success" message={statusMessage} />
          <FormStatusBanner variant="error" message={formError} />

          <div className="flex max-w-sm flex-col gap-1.5">
            <Label htmlFor={budgetId}>Default budget (₹)</Label>
            <Input
              id={budgetId}
              type="number"
              min={0}
              step={500}
              inputMode="numeric"
              placeholder="e.g. 90000"
              className="tabular-nums"
              disabled={isBusy}
              aria-invalid={Boolean(errors.budget_default)}
              aria-describedby={budgetDescribedBy}
              {...register('budget_default')}
            />
            <p id={budgetHintId} className="text-xs text-muted-foreground">
              Optional upper budget in INR. Leave blank for no default cap.
            </p>
            {errors.budget_default && (
              <p id={`${budgetId}-error`} className="text-sm text-negative">
                {errors.budget_default.message}
              </p>
            )}
          </div>

          <Controller
            name="favourite_categories"
            control={control}
            render={({ field }) => (
              <CategorySelector
                value={field.value}
                onChange={field.onChange}
                disabled={isBusy}
                error={errors.favourite_categories?.message}
              />
            )}
          />

          <Controller
            name="priorities"
            control={control}
            render={({ field }) => (
              <PrioritySelector
                value={field.value}
                onChange={field.onChange}
                disabled={isBusy}
                error={errors.priorities?.message}
              />
            )}
          />

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              type="submit"
              size="lg"
              disabled={isBusy}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2
                    className="size-4 animate-spin"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  Saving preferences…
                </>
              ) : (
                'Save preferences'
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={isBusy || !hasAnythingToClear}
              aria-busy={isClearing}
              onClick={() => {
                void handleClearPreferences();
              }}
            >
              {isClearing ? 'Clearing…' : 'Clear preferences'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
