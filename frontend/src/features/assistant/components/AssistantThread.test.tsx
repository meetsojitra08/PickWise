import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { CompareProvider } from '@/features/compare/components/CompareProvider';
import { AssistantThread } from './AssistantThread';
import type { AssistantMessage } from '../types/assistant';

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CompareProvider>
          <MemoryRouter>{ui}</MemoryRouter>
        </CompareProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

const mockMessages: AssistantMessage[] = [
  {
    id: 1,
    role: 'user',
    content: 'Suggest a lightweight ultrabook',
    recommendations: [],
    alternatives: [],
    status: 'ok',
    created_at: '2026-11-15T10:00:00Z',
  },
  {
    id: 2,
    role: 'assistant',
    content: 'Here is an ultrabook that matches your needs.',
    recommendations: [],
    alternatives: [],
    status: 'ok',
    created_at: '2026-11-15T10:00:05Z',
  },
];

describe('AssistantThread', () => {
  it('renders loading skeleton when isLoadingConversation is true', () => {
    renderWithProviders(
      <AssistantThread
        messages={[]}
        isLoadingConversation={true}
        onSelectPrompt={vi.fn()}
      />,
    );

    const statusEl = screen.getByRole('status', {
      name: 'Loading conversation…',
    });
    expect(statusEl).toBeInTheDocument();
    expect(statusEl).toHaveAttribute('aria-busy', 'true');
  });

  it('renders ErrorState when isConversationError is true and handles retry & new chat', async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();
    const handleNewChat = vi.fn();

    renderWithProviders(
      <AssistantThread
        messages={[]}
        isConversationError={true}
        onRetryConversation={handleRetry}
        onNewChat={handleNewChat}
        onSelectPrompt={vi.fn()}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Could not load conversation',
      }),
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: 'Retry' });
    await user.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);

    const newChatBtn = screen.getByRole('button', { name: 'Start new chat' });
    await user.click(newChatBtn);
    expect(handleNewChat).toHaveBeenCalledTimes(1);
  });

  it('renders generating message state when isSendingMessage is true', () => {
    renderWithProviders(
      <AssistantThread
        messages={mockMessages}
        isSendingMessage={true}
        onSelectPrompt={vi.fn()}
      />,
    );

    expect(screen.getByText('Finding products…')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders send error alert and retry button', async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();

    renderWithProviders(
      <AssistantThread
        messages={mockMessages}
        sendError={new Error('Connection timed out')}
        onRetry={handleRetry}
        onSelectPrompt={vi.fn()}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('Connection timed out')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: 'Retry' });
    await user.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders user and assistant messages', () => {
    renderWithProviders(
      <AssistantThread messages={mockMessages} onSelectPrompt={vi.fn()} />,
    );

    expect(
      screen.getByText('Suggest a lightweight ultrabook'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Here is an ultrabook that matches your needs.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Pickwise Advisor')).toBeInTheDocument();
  });
});
