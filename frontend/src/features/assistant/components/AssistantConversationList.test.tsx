import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AssistantConversationList } from './AssistantConversationList';
import type { AiConversationSummary } from '../types/assistant';

const mockConversations: AiConversationSummary[] = [
  {
    id: 1,
    title: 'Gaming Laptop under 1 Lakh',
    last_message_at: '2026-11-14T10:00:00Z',
    created_at: '2026-11-14T09:00:00Z',
    updated_at: '2026-11-14T10:00:00Z',
    messages_count: 4,
  },
  {
    id: 2,
    title: 'Wireless Earbuds with ANC',
    last_message_at: '2026-11-13T15:30:00Z',
    created_at: '2026-11-13T15:00:00Z',
    updated_at: '2026-11-13T15:30:00Z',
    messages_count: 2,
  },
];

describe('AssistantConversationList', () => {
  it('renders loading skeleton when isLoading is true', () => {
    render(
      <AssistantConversationList
        conversations={[]}
        activeConversationId={null}
        onSelectConversation={vi.fn()}
        onNewConversation={vi.fn()}
        onDeleteConversation={vi.fn()}
        isLoading={true}
      />,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(
      screen.getByText('Loading conversation history…'),
    ).toBeInTheDocument();
  });

  it('renders error state and invokes onRetry', async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();

    render(
      <AssistantConversationList
        conversations={[]}
        activeConversationId={null}
        onSelectConversation={vi.fn()}
        onNewConversation={vi.fn()}
        onDeleteConversation={vi.fn()}
        isError={true}
        onRetry={handleRetry}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Couldn't load history")).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: 'Retry' });
    await user.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when there are no conversations', () => {
    render(
      <AssistantConversationList
        conversations={[]}
        activeConversationId={null}
        onSelectConversation={vi.fn()}
        onNewConversation={vi.fn()}
        onDeleteConversation={vi.fn()}
        isLoading={false}
        isError={false}
      />,
    );

    expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    expect(
      screen.getByText('Your chat history will be saved here'),
    ).toBeInTheDocument();
  });

  it('renders conversations list and handles selection and deletion', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    const handleDelete = vi.fn();
    const handleNew = vi.fn();

    render(
      <AssistantConversationList
        conversations={mockConversations}
        activeConversationId={1}
        onSelectConversation={handleSelect}
        onNewConversation={handleNew}
        onDeleteConversation={handleDelete}
      />,
    );

    expect(screen.getByText('Conversations')).toBeInTheDocument();
    expect(screen.getByText('Gaming Laptop under 1 Lakh')).toBeInTheDocument();
    expect(screen.getByText('Wireless Earbuds with ANC')).toBeInTheDocument();

    // Click conversation #2
    const secondConvBtn = screen.getByRole('button', {
      name: 'Wireless Earbuds with ANC',
    });
    await user.click(secondConvBtn);
    expect(handleSelect).toHaveBeenCalledWith(2);

    // Delete conversation #1
    const deleteBtn = screen.getByRole('button', {
      name: 'Delete conversation: Gaming Laptop under 1 Lakh',
    });
    await user.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledWith(1);

    // New chat
    const newChatBtn = screen.getByRole('button', { name: 'New chat' });
    await user.click(newChatBtn);
    expect(handleNew).toHaveBeenCalledTimes(1);
  });
});
