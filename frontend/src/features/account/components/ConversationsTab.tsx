import { MessageSquare } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useInfiniteConversations } from '@/features/assistant/hooks/use-assistant';
import { AccountEmptyTab } from './AccountEmptyTab';
import { ConversationCard } from './ConversationCard';

export function ConversationsTab() {
  const conversations = useInfiniteConversations();

  if (conversations.isPending) {
    return (
      <div
        className="space-y-3"
        role="status"
        aria-label="Loading assistant conversations"
      >
        {[0, 1].map((index) => (
          <Skeleton key={index} className="h-28 w-full rounded-card" />
        ))}
      </div>
    );
  }

  if (conversations.isError) {
    return (
      <EmptyState
        title="Your conversations could not load"
        description="Check your connection and try again."
        actionLabel="Try again"
        onAction={() => void conversations.refetch()}
        icon={
          <MessageSquare
            className="size-5"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        }
      />
    );
  }

  if (conversations.items.length === 0) {
    return <AccountEmptyTab tab="conversations" />;
  }

  return (
    <section aria-labelledby="conversations-heading">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="conversations-heading"
            className="font-heading text-2xl font-semibold tracking-tight"
          >
            Assistant conversations
          </h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            {conversations.total}{' '}
            {conversations.total === 1 ? 'conversation' : 'conversations'}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/assistant">Start new chat</Link>
        </Button>
      </div>

      <div className="space-y-3">
        {conversations.items.map((conversation) => (
          <ConversationCard key={conversation.id} conversation={conversation} />
        ))}
      </div>

      {conversations.hasNextPage ? (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={conversations.isFetchingNextPage}
            onClick={() => void conversations.fetchNextPage()}
          >
            {conversations.isFetchingNextPage
              ? 'Loading…'
              : 'Load more conversations'}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
