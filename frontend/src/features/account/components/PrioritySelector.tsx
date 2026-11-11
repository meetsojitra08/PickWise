import { useId, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  MAX_PRIORITIES,
  PRIORITY_OPTIONS,
  getPriorityLabel,
} from '../lib/account-options';

interface PrioritySelectorProps {
  value: string[];
  onChange: (next: string[]) => void;
  disabled: boolean;
  error?: string;
}

const PRESET_PRIORITY_KEYS = new Set(
  PRIORITY_OPTIONS.map((option) => option.value.toLowerCase()),
);

export function PrioritySelector({
  value,
  onChange,
  disabled,
  error,
}: PrioritySelectorProps) {
  const [customDraft, setCustomDraft] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);
  const customInputId = useId();
  const limitReached = value.length >= MAX_PRIORITIES;

  function isSelected(priority: string): boolean {
    const target = priority.toLowerCase();
    return value.some((item) => item.toLowerCase() === target);
  }

  function togglePriority(priority: string): void {
    const target = priority.toLowerCase();

    if (isSelected(priority)) {
      setDraftError(null);
      onChange(value.filter((item) => item.toLowerCase() !== target));
      return;
    }

    if (limitReached) {
      setDraftError(`You can choose up to ${MAX_PRIORITIES} priorities.`);
      return;
    }

    setDraftError(null);
    onChange([...value, priority]);
  }

  function addCustomPriority(): void {
    const trimmed = customDraft.trim();

    if (trimmed.length < 2) {
      setDraftError('Enter at least 2 characters to add a priority.');
      return;
    }

    if (trimmed.length > 50) {
      setDraftError('Priority must be 50 characters or fewer.');
      return;
    }

    if (isSelected(trimmed)) {
      setDraftError('That priority is already selected.');
      return;
    }

    if (limitReached) {
      setDraftError(`You can choose up to ${MAX_PRIORITIES} priorities.`);
      return;
    }

    setDraftError(null);
    onChange([...value, trimmed]);
    setCustomDraft('');
  }

  const customSelected = value.filter(
    (item) => !PRESET_PRIORITY_KEYS.has(item.toLowerCase()),
  );
  const activeError = error ?? draftError;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">
          Shopping priorities
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {value.length} / {MAX_PRIORITIES} selected
        </span>
      </div>

      <div
        role="group"
        aria-label="Shopping priorities"
        className="flex flex-wrap gap-2"
      >
        {PRIORITY_OPTIONS.map((option) => {
          const selected = isSelected(option.value);

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled || (!selected && limitReached)}
              aria-pressed={selected}
              onClick={() => togglePriority(option.value)}
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

        {customSelected.map((custom) => (
          <button
            key={custom.toLowerCase()}
            type="button"
            disabled={disabled}
            aria-label={`Remove priority ${getPriorityLabel(custom)}`}
            onClick={() => togglePriority(custom)}
            className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-primary bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {custom}
            <X className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 sm:max-w-sm">
        <Label
          htmlFor={customInputId}
          className="text-xs text-muted-foreground"
        >
          Add a custom priority (optional)
        </Label>
        <div className="flex gap-2">
          <Input
            id={customInputId}
            type="text"
            value={customDraft}
            placeholder="e.g. USB-C charging"
            disabled={disabled || limitReached}
            onChange={(event) => {
              setCustomDraft(event.target.value);
              if (draftError) {
                setDraftError(null);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addCustomPriority();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={
              disabled || limitReached || customDraft.trim().length === 0
            }
            onClick={addCustomPriority}
          >
            <Plus className="size-4" strokeWidth={1.5} aria-hidden="true" />
            Add
          </Button>
        </div>
      </div>

      {activeError ? (
        <p className="text-sm text-negative">{activeError}</p>
      ) : null}
    </div>
  );
}
