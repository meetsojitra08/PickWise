import { MessageSquare, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AiConversationSummary } from '../types/assistant';

interface AssistantConversationListProps {
  conversations: AiConversationSummary[];
  activeConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: number) => void;
  isLoading?: boolean;
  className?: string;
}

export function AssistantConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isLoading = false,
  className,
}: AssistantConversationListProps) {
  return (
    <aside
      aria-label="Conversation history"
      className={cn('flex h-full flex-col gap-3', className)}
    >
      {/* Header with New Chat Button */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="size-4 text-primary" />
          <h2 className="font-heading text-sm font-bold text-foreground">
            Conversations
          </h2>
          {conversations.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-semibold text-muted-foreground tabular-nums">
              {conversations.length}
            </span>
          )}
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onNewConversation}
          className="h-7 gap-1 rounded-full px-2.5 text-xs font-semibold hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          <span>New chat</span>
        </Button>
      </div>

      {/* Conversation List Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {isLoading && (
          <div className="space-y-2 py-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-11 w-full animate-pulse rounded-lg bg-muted/50"
              />
            ))}
          </div>
        )}

        {!isLoading && conversations.length === 0 && (
          <div className="py-12 text-center text-xs text-muted-foreground">
            <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
              <Sparkles className="size-5 opacity-40" />
            </div>
            <p className="font-medium text-foreground">No conversations yet</p>
            <p className="mt-1 text-[11px]">
              Your chat history will be saved here
            </p>
          </div>
        )}

        {!isLoading &&
          conversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const displayTitle = conv.title?.trim() || `Chat #${conv.id}`;

            return (
              <div
                key={conv.id}
                className={cn(
                  'group flex items-center justify-between gap-2 rounded-xl p-2 px-2.5 text-left text-xs transition-all',
                  isActive
                    ? 'border-l-3 border-primary bg-primary/10 font-semibold text-primary shadow-2xs'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectConversation(conv.id)}
                  className="min-w-0 flex-1 truncate text-left focus-visible:outline-2 focus-visible:outline-ring"
                  title={displayTitle}
                >
                  <p className="truncate leading-snug">{displayTitle}</p>
                </button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Delete conversation: ${displayTitle}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                  className="size-6 p-0 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 hover:text-negative hover:bg-negative/10"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            );
          })}
      </div>
    </aside>
  );
}
