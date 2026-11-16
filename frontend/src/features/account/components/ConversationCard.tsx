import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useDeleteConversation } from '@/features/assistant/hooks/use-assistant';
import type { AiConversationSummary } from '@/features/assistant/types/assistant';

function formatConversationDate(dateStr: string | null): string | null {
  if (!dateStr) {
    return null;
  }

  const parsed = new Date(dateStr);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function ConversationCard({
  conversation,
}: {
  conversation: AiConversationSummary;
}) {
  const deleteConversation = useDeleteConversation();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const displayTitle =
    conversation.title?.trim() || `Conversation #${conversation.id}`;

  const timestamp = conversation.last_message_at || conversation.created_at;
  const formattedDate = formatConversationDate(timestamp);

  const messageCountLabel =
    conversation.messages_count !== undefined &&
    conversation.messages_count !== null
      ? `${conversation.messages_count} ${conversation.messages_count === 1 ? 'message' : 'messages'}`
      : null;

  const meta = [
    messageCountLabel,
    formattedDate ? `Updated ${formattedDate}` : null,
  ].filter(Boolean);

  function handleDelete(): void {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    deleteConversation.mutate(conversation.id, {
      onSuccess: () => {
        toast.success('Conversation deleted.');
      },
      onError: () => {
        toast.error('Failed to delete conversation. Please try again.');
        setConfirmingDelete(false);
      },
    });
  }

  return (
    <article className="rounded-card border border-border bg-card p-4 transition-colors hover:border-primary/20 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <MessageSquare
              className="size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <h3 className="truncate font-heading text-lg font-semibold text-foreground">
              {displayTitle}
            </h3>
          </div>
          {meta.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {meta.join(' · ')}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link to={`/assistant?conversation=${conversation.id}`}>
              Open conversation
            </Link>
          </Button>
          <Button
            type="button"
            variant={confirmingDelete ? 'destructive' : 'outline'}
            size="sm"
            disabled={deleteConversation.isPending}
            onClick={handleDelete}
            aria-label={
              confirmingDelete
                ? `Confirm delete conversation: ${displayTitle}`
                : `Delete conversation: ${displayTitle}`
            }
          >
            {deleteConversation.isPending
              ? 'Deleting…'
              : confirmingDelete
                ? 'Confirm delete'
                : 'Delete'}
          </Button>
        </div>
      </div>
    </article>
  );
}
