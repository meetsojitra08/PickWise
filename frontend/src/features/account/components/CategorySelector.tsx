import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STARTER_CATEGORY_OPTIONS } from '../lib/account-options';

interface CategorySelectorProps {
  value: string[];
  onChange: (next: string[]) => void;
  disabled: boolean;
  error?: string;
}

export function CategorySelector({
  value,
  onChange,
  disabled,
  error,
}: CategorySelectorProps) {
  function toggleCategory(slug: string): void {
    if (value.includes(slug)) {
      onChange(value.filter((item) => item !== slug));
      return;
    }

    onChange([...value, slug]);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">
          Favourite categories
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {value.length} selected
        </span>
      </div>

      <div
        role="group"
        aria-label="Favourite categories"
        className="flex flex-wrap gap-2"
      >
        {STARTER_CATEGORY_OPTIONS.map((option) => {
          const selected = value.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => toggleCategory(option.value)}
              className={cn(
                'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50',
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-foreground hover:bg-muted',
              )}
            >
              {selected ? (
                <Check
                  className="size-3.5"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              ) : null}
              {option.label}
            </button>
          );
        })}
      </div>

      {error ? <p className="text-sm text-negative">{error}</p> : null}
    </div>
  );
}
