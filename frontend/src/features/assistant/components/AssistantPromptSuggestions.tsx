import {
  ArrowRight,
  Bot,
  Headphones,
  Laptop,
  Monitor,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  type PromptSuggestion,
  STARTER_PROMPT_SUGGESTIONS,
} from '../lib/assistant-prompts';

interface AssistantPromptSuggestionsProps {
  onSelect: (suggestion: PromptSuggestion) => void;
  disabled?: boolean;
}

const PROMPT_ICONS = [Laptop, Headphones, Monitor];

export function AssistantPromptSuggestions({
  onSelect,
  disabled = false,
}: AssistantPromptSuggestionsProps) {
  const { user } = useAuth();
  const firstName = user?.name ? user.name.split(' ')[0] : null;

  return (
    <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in duration-300">
      {/* Brand Icon Mark */}
      <div className="relative mb-4 flex size-14 items-center justify-center rounded-2xl border border-accent/40 bg-accent/15 text-accent shadow-xs">
        <Bot
          className="size-7 text-accent"
          strokeWidth={1.8}
          aria-hidden="true"
        />
        <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold shadow-xs">
          ✦
        </span>
      </div>

      {/* Welcoming Headline */}
      <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {firstName ? `Welcome, ${firstName}!` : 'What are you shopping for?'}
      </h2>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
        Ask questions in natural language. I compare verified specs from our
        database to find the best products within your budget.
      </p>

      {/* Suggested Prompts Grid */}
      <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
        {STARTER_PROMPT_SUGGESTIONS.map((suggestion, index) => {
          const Icon = PROMPT_ICONS[index % PROMPT_ICONS.length] ?? Sparkles;
          const budgetLabel = suggestion.budget
            ? `Under ₹${suggestion.budget.toLocaleString('en-IN')}`
            : suggestion.category
              ? suggestion.category.toUpperCase()
              : null;

          return (
            <button
              key={suggestion.text}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(suggestion)}
              className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-4" strokeWidth={2} />
                  </div>
                  {budgetLabel && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-semibold tabular-nums"
                    >
                      {budgetLabel}
                    </Badge>
                  )}
                </div>

                <p className="font-medium text-xs text-foreground group-hover:text-primary leading-snug">
                  &ldquo;{suggestion.text}&rdquo;
                </p>
              </div>

              <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-muted-foreground group-hover:text-primary">
                <span>Ask this</span>
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Trust reassurance pills */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-positive" />
          Real catalog products only
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-accent" />
          Strict budget grounding
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-primary" />
          Honest trade-offs
        </span>
      </div>
    </div>
  );
}
