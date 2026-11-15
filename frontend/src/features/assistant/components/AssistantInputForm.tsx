import { type KeyboardEvent, useState } from 'react';
import { ArrowUp, CornerDownLeft, Sparkles, Tag, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCatalogCategories } from '@/features/catalog/hooks/use-catalog-data';
import type { CatalogCategory } from '@/features/catalog/types/catalog-api';
import { cn } from '@/lib/utils';
import type { SendMessagePayload } from '../types/assistant';

interface AssistantInputFormProps {
  onSubmit: (payload: SendMessagePayload) => void;
  isPending?: boolean;
  isQuotaExhausted?: boolean;
  initialPrompt?: string;
  initialCategory?: string;
  initialBudget?: number;
  className?: string;
}

function flattenCategories(categories: CatalogCategory[]): CatalogCategory[] {
  return categories.flatMap((cat) => [
    cat,
    ...flattenCategories(cat.children ?? []),
  ]);
}

export function AssistantInputForm({
  onSubmit,
  isPending = false,
  isQuotaExhausted = false,
  initialPrompt = '',
  initialCategory = '',
  initialBudget,
  className,
}: AssistantInputFormProps) {
  const [message, setMessage] = useState(initialPrompt);
  const [category, setCategory] = useState(initialCategory);
  const [budgetMax, setBudgetMax] = useState<string>(
    initialBudget !== undefined ? String(initialBudget) : '',
  );

  const [prevInitialPrompt, setPrevInitialPrompt] = useState(initialPrompt);
  if (initialPrompt !== prevInitialPrompt) {
    setPrevInitialPrompt(initialPrompt);
    setMessage(initialPrompt);
  }

  const [prevInitialCategory, setPrevInitialCategory] =
    useState(initialCategory);
  if (initialCategory !== prevInitialCategory) {
    setPrevInitialCategory(initialCategory);
    setCategory(initialCategory);
  }

  const [prevInitialBudget, setPrevInitialBudget] = useState(initialBudget);
  if (initialBudget !== prevInitialBudget) {
    setPrevInitialBudget(initialBudget);
    setBudgetMax(initialBudget !== undefined ? String(initialBudget) : '');
  }

  const { data: categoriesResponse } = useCatalogCategories();
  const flatCategories = categoriesResponse
    ? flattenCategories(categoriesResponse.data)
    : [];

  const trimmedMessage = message.trim();
  const isValidLength =
    trimmedMessage.length >= 2 && trimmedMessage.length <= 500;
  const canSubmit = !isPending && !isQuotaExhausted && isValidLength;

  function handleSubmit() {
    if (!canSubmit) return;

    const parsedBudget =
      budgetMax.trim() !== '' && !Number.isNaN(Number(budgetMax))
        ? Number(budgetMax)
        : null;

    onSubmit({
      message: trimmedMessage,
      category: category.trim() !== '' ? category : null,
      budget_max: parsedBudget,
    });

    setMessage('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className={cn('relative space-y-2', className)}>
      {isQuotaExhausted && (
        <div
          role="alert"
          className="rounded-xl border border-negative/30 bg-negative/10 px-3.5 py-2.5 text-xs font-medium text-negative shadow-2xs"
        >
          You&apos;ve used today&apos;s AI answers. Browse and filter products
          in the meantime.
        </div>
      )}

      {/* Main Unified Input Capsule */}
      <div
        className={cn(
          'relative rounded-2xl border border-border/80 bg-card p-3 shadow-md transition-all',
          'focus-within:border-primary/60 focus-within:ring-3 focus-within:ring-primary/15',
          isQuotaExhausted && 'opacity-60 cursor-not-allowed',
        )}
      >
        {/* Top Controls: Category & Budget Filters */}
        <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-border/50 pb-2">
          {/* Category Select Pill */}
          <div className="relative flex items-center">
            <Tag
              className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <label htmlFor="assistant-category" className="sr-only">
              Filter by category
            </label>
            <select
              id="assistant-category"
              aria-label="Filter by category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isPending || isQuotaExhausted}
              className="h-7 cursor-pointer appearance-none rounded-full border border-border/70 bg-muted/40 pr-6 pl-7 text-[11px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              <option value="">All categories</option>
              {flatCategories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 text-[10px] text-muted-foreground">
              ▾
            </span>
          </div>

          {/* Budget Input Pill */}
          <div className="relative flex items-center">
            <Wallet
              className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <label htmlFor="assistant-budget" className="sr-only">
              Maximum budget in rupees
            </label>
            <input
              id="assistant-budget"
              type="number"
              min={0}
              step={500}
              placeholder="Max budget (₹)"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              disabled={isPending || isQuotaExhausted}
              className="h-7 w-32 rounded-full border border-border/70 bg-muted/40 pr-2.5 pl-7 text-[11px] font-medium text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring tabular-nums"
            />
          </div>

          {(category !== '' || budgetMax !== '') && (
            <button
              type="button"
              onClick={() => {
                setCategory('');
                setBudgetMax('');
              }}
              className="cursor-pointer text-[10px] font-medium text-muted-foreground hover:text-foreground"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Textarea for shopper message */}
        <div className="relative">
          <label htmlFor="assistant-message" className="sr-only">
            Message to assistant
          </label>
          <Textarea
            id="assistant-message"
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending || isQuotaExhausted}
            placeholder={
              isQuotaExhausted
                ? 'Daily AI limit reached'
                : "What are you looking for? (e.g., 'Laptop for video editing under 90,000')"
            }
            maxLength={500}
            className="min-h-[58px] resize-none border-0 bg-transparent p-0 pr-12 text-sm leading-relaxed shadow-none focus-visible:ring-0 placeholder:text-muted-foreground"
          />

          {/* Bottom Bar inside the capsule */}
          <div className="mt-2 flex items-center justify-between pt-1">
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CornerDownLeft className="size-3 text-muted-foreground/70" />
              <span>Enter to send · Shift+Enter for newline</span>
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
              <span
                className={cn(
                  'text-[10px] tabular-nums',
                  message.length > 450
                    ? 'text-negative font-semibold'
                    : 'text-muted-foreground',
                )}
                aria-live="polite"
              >
                {message.length}/500
              </span>

              <Button
                type="button"
                size="sm"
                disabled={!canSubmit}
                onClick={handleSubmit}
                aria-label="Send message"
                className="size-8 rounded-full p-0 shadow-xs"
              >
                {isPending ? (
                  <Sparkles className="size-4 animate-spin" />
                ) : (
                  <ArrowUp className="size-4 stroke-[2.5]" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
