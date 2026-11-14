import { useEffect, useRef } from 'react';
import { AlertCircle, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AssistantMessage } from '../types/assistant';
import { AssistantPromptSuggestions } from './AssistantPromptSuggestions';
import type { PromptSuggestion } from '../lib/assistant-prompts';
import { AssistantThreadMessage } from './AssistantThreadMessage';

interface AssistantThreadProps {
  messages: AssistantMessage[];
  isLoadingConversation?: boolean;
  isSendingMessage?: boolean;
  sendError?: Error | null;
  onRetry?: () => void;
  onSelectPrompt: (suggestion: PromptSuggestion) => void;
  className?: string;
}

export function AssistantThread({
  messages,
  isLoadingConversation = false,
  isSendingMessage = false,
  sendError,
  onRetry,
  onSelectPrompt,
  className,
}: AssistantThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof bottomRef.current?.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSendingMessage, sendError]);

  if (isLoadingConversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <Loader2 className="size-8 animate-spin text-primary opacity-60" />
        <p className="mt-3 text-sm text-muted-foreground font-medium">
          Loading conversation…
        </p>
      </div>
    );
  }

  const isEmpty = messages.length === 0;

  return (
    <div
      className={cn(
        'flex flex-1 flex-col overflow-y-auto px-4 py-6',
        className,
      )}
      tabIndex={0}
      aria-label="Assistant message thread"
    >
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {isEmpty && !isSendingMessage && (
          <AssistantPromptSuggestions onSelect={onSelectPrompt} />
        )}

        {messages.map((message) => (
          <AssistantThreadMessage key={message.id} message={message} />
        ))}

        {isSendingMessage && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-3.5 text-sm animate-in fade-in duration-300"
          >
            <div
              className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-xl border border-accent/40 bg-accent/15 text-accent shadow-xs"
              aria-hidden="true"
            >
              <Sparkles className="size-4.5 text-accent animate-pulse" />
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 text-primary font-medium text-xs">
                <Loader2 className="size-3.5 animate-spin text-primary" />
                <span>Finding products…</span>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-1 md:grid-cols-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border/70 bg-card p-4 space-y-3.5 shadow-2xs"
                  >
                    <div className="flex gap-3">
                      <Skeleton className="size-20 shrink-0 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-8 w-2/3 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {sendError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-xl border border-negative/30 bg-negative/10 p-3.5 text-xs text-negative shadow-2xs"
          >
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              <span>
                {sendError.message ||
                  'Failed to send message. Please try again.'}
              </span>
            </div>

            {onRetry && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="h-7 gap-1 rounded-full text-xs"
              >
                <RotateCcw className="size-3" />
                <span>Retry</span>
              </Button>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
