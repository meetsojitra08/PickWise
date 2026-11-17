import { useEffect, useRef } from 'react';
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { ErrorState } from '@/components/shared/ErrorState';
import { AiMark } from '@/components/shared/VerdictPanel';
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
  isConversationError?: boolean;
  onRetryConversation?: () => void;
  onNewChat?: () => void;
  isSendingMessage?: boolean;
  sendError?: Error | null;
  onRetry?: () => void;
  onSelectPrompt: (suggestion: PromptSuggestion) => void;
  isQuotaExhausted?: boolean;
  className?: string;
}

export function AssistantThread({
  messages,
  isLoadingConversation = false,
  isConversationError = false,
  onRetryConversation,
  onNewChat,
  isSendingMessage = false,
  sendError,
  onRetry,
  onSelectPrompt,
  isQuotaExhausted = false,
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
      <div
        className={cn(
          'flex flex-1 flex-col overflow-y-auto px-4 py-6',
          className,
        )}
        role="status"
        aria-busy="true"
        aria-label="Loading conversation…"
      >
        <span className="sr-only">Loading conversation…</span>
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            <span>Loading conversation…</span>
          </div>

          {/* User message placeholder */}
          <div className="flex justify-end">
            <Skeleton className="h-12 w-64 rounded-2xl rounded-tr-xs" />
          </div>

          {/* Assistant message placeholder */}
          <div className="flex items-start gap-3.5">
            <Skeleton className="mt-1 size-9 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-14 w-full rounded-xl" />
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
        </div>
      </div>
    );
  }

  if (isConversationError) {
    return (
      <div
        className={cn('flex flex-1 items-center justify-center p-6', className)}
      >
        <div className="w-full max-w-md">
          <ErrorState
            title="Could not load conversation"
            description="We couldn't retrieve the messages for this chat. Check your internet connection and try again."
            retryLabel="Retry"
            onRetry={onRetryConversation}
            actionLabel="Start new chat"
            onAction={onNewChat}
          />
        </div>
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
          <AssistantPromptSuggestions
            onSelect={onSelectPrompt}
            isQuotaExhausted={isQuotaExhausted}
          />
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
              <AiMark className="size-4.5 text-accent animate-pulse" />
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
                className="h-7 gap-1 rounded-full text-xs font-semibold"
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
