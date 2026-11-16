import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthContext,
  type AuthContextValue,
} from '@/features/auth/hooks/auth-context';
import type { User } from '@/features/auth/types/auth';
import type { AiConversationSummary } from '@/features/assistant/types/assistant';
import { ConversationsTab } from './ConversationsTab';

const customer: User = {
  id: 7,
  name: 'Rohan Mehta',
  email: 'rohan@example.com',
  role: 'customer',
  preferences: null,
  is_active: true,
  email_verified_at: null,
  created_at: '2026-11-11T10:00:00Z',
};

const authenticatedAuth: AuthContextValue = {
  user: customer,
  status: 'authenticated',
  isLoading: false,
  isAuthenticated: true,
  isAdmin: false,
  authError: null,
  login: async () => {
    throw new Error('Not implemented');
  },
  register: async () => {
    throw new Error('Not implemented');
  },
  logout: async () => {},
  refetchUser: async () => null,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function listPayload(
  conversations: AiConversationSummary[],
  page = 1,
  lastPage = 1,
) {
  return {
    data: conversations,
    meta: {
      current_page: page,
      per_page: 12,
      total: conversations.length,
      last_page: lastPage,
    },
    links: {},
  };
}

function renderTab(queryClient?: QueryClient) {
  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={authenticatedAuth}>
        <MemoryRouter initialEntries={['/account?tab=conversations']}>
          <Routes>
            <Route path="/account" element={<ConversationsTab />} />
            <Route path="/assistant" element={<h1>Assistant Page</h1>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ConversationsTab', () => {
  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=test-token; path=/';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.cookie =
      'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    vi.restoreAllMocks();
  });

  it('renders loading skeleton while conversations are pending', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise(() => {}),
    );

    renderTab();

    expect(
      screen.getByRole('status', { name: 'Loading assistant conversations' }),
    ).toBeInTheDocument();
  });

  it('renders error state with retry button on network failure', async () => {
    const user = userEvent.setup();
    let attempt = 0;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      attempt++;
      if (attempt === 1) {
        return jsonResponse(
          {
            error: {
              code: 'server_error',
              message: 'Failed to load conversations',
            },
          },
          500,
        );
      }
      return jsonResponse(listPayload([]));
    });

    renderTab();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Your conversations could not load',
      }),
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: 'Try again' });
    await user.click(retryBtn);

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'No assistant conversations yet',
      }),
    ).toBeInTheDocument();
  });

  it('renders empty state when there are no conversations', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse(listPayload([])),
    );

    renderTab();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'No assistant conversations yet',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: 'Open assistant' }),
    ).toHaveAttribute('href', '/assistant');
  });

  it('lists conversations with title, formatted date, message count, and start new chat link', async () => {
    const mockConversations: AiConversationSummary[] = [
      {
        id: 101,
        title: 'Laptops for video editing under 90,000',
        last_message_at: '2026-11-15T10:30:00Z',
        created_at: '2026-11-15T10:00:00Z',
        updated_at: '2026-11-15T10:30:00Z',
        messages_count: 4,
      },
      {
        id: 102,
        title: null,
        last_message_at: null,
        created_at: '2026-11-14T08:00:00Z',
        updated_at: '2026-11-14T08:00:00Z',
        messages_count: 1,
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse(listPayload(mockConversations)),
    );

    renderTab();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Assistant conversations',
      }),
    ).toBeInTheDocument();

    expect(screen.getByText('2 conversations')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Start new chat' }),
    ).toHaveAttribute('href', '/assistant');

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Laptops for video editing under 90,000',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/4 messages · Updated 15 Nov 2026/),
    ).toBeInTheDocument();

    // Fallback title for conversation with null title
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Conversation #102',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/1 message · Updated 14 Nov 2026/),
    ).toBeInTheDocument();

    // Check Open conversation links
    const openLinks = screen.getAllByRole('link', {
      name: 'Open conversation',
    });
    expect(openLinks[0]).toHaveAttribute('href', '/assistant?conversation=101');
    expect(openLinks[1]).toHaveAttribute('href', '/assistant?conversation=102');
  });

  it('deletes a conversation with confirmation and updates the list', async () => {
    const user = userEvent.setup();
    const mockConversations: AiConversationSummary[] = [
      {
        id: 101,
        title: 'Laptops for video editing under 90,000',
        last_message_at: '2026-11-15T10:30:00Z',
        created_at: '2026-11-15T10:00:00Z',
        updated_at: '2026-11-15T10:30:00Z',
        messages_count: 4,
      },
    ];

    let deleted = false;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.includes('/assistant/conversations') && method === 'GET') {
        return jsonResponse(listPayload(deleted ? [] : mockConversations));
      }

      if (url.includes('/assistant/conversations/101') && method === 'DELETE') {
        deleted = true;
        return new Response(null, { status: 204 });
      }

      return jsonResponse({}, 404);
    });

    renderTab();

    expect(
      await screen.findByRole('heading', {
        level: 3,
        name: 'Laptops for video editing under 90,000',
      }),
    ).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', {
      name: 'Delete conversation: Laptops for video editing under 90,000',
    });
    await user.click(deleteBtn);

    // Confirmation button state
    const confirmBtn = screen.getByRole('button', {
      name: 'Confirm delete conversation: Laptops for video editing under 90,000',
    });
    expect(confirmBtn).toHaveTextContent('Confirm delete');

    await user.click(confirmBtn);

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', {
          level: 3,
          name: 'Laptops for video editing under 90,000',
        }),
      ).not.toBeInTheDocument();
    });
  });

  it('loads more conversations when hasNextPage is true', async () => {
    const user = userEvent.setup();
    const page1: AiConversationSummary[] = [
      {
        id: 1,
        title: 'Chat One',
        last_message_at: '2026-11-15T10:00:00Z',
        created_at: '2026-11-15T10:00:00Z',
        updated_at: '2026-11-15T10:00:00Z',
        messages_count: 2,
      },
    ];
    const page2: AiConversationSummary[] = [
      {
        id: 2,
        title: 'Chat Two',
        last_message_at: '2026-11-14T10:00:00Z',
        created_at: '2026-11-14T10:00:00Z',
        updated_at: '2026-11-14T10:00:00Z',
        messages_count: 1,
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('page=2')) {
        return jsonResponse({
          data: page2,
          meta: { current_page: 2, per_page: 12, total: 2, last_page: 2 },
          links: {},
        });
      }
      return jsonResponse({
        data: page1,
        meta: { current_page: 1, per_page: 12, total: 2, last_page: 2 },
        links: {},
      });
    });

    renderTab();

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Chat One' }),
    ).toBeInTheDocument();

    const loadMoreBtn = screen.getByRole('button', {
      name: 'Load more conversations',
    });
    await user.click(loadMoreBtn);

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Chat Two' }),
    ).toBeInTheDocument();
  });
});
