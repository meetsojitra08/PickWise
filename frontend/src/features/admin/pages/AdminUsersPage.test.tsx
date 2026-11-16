import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '@/features/auth/hooks/auth-context';
import { AdminUsersPage } from './AdminUsersPage';
import type { AdminUser } from '../types';

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const mockCurrentUser = {
  id: 1,
  name: 'Root Administrator',
  email: 'admin@pickwise.test',
  role: 'admin' as const,
  is_active: true,
  preferences: null,
  email_verified_at: '2026-11-01T00:00:00Z',
  created_at: '2026-11-01T00:00:00Z',
};

const mockAuthValue: AuthContextValue = {
  user: mockCurrentUser,
  status: 'authenticated',
  isLoading: false,
  isAuthenticated: true,
  isAdmin: true,
  authError: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refetchUser: vi.fn(),
};

const mockUsers: AdminUser[] = [
  {
    id: 1,
    name: 'Root Administrator',
    email: 'admin@pickwise.test',
    role: 'admin',
    is_active: true,
    reviews_count: 0,
    created_at: '2026-11-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Alice Green',
    email: 'alice@example.com',
    role: 'customer',
    is_active: true,
    reviews_count: 4,
    created_at: '2026-11-05T00:00:00Z',
  },
  {
    id: 3,
    name: 'Bob White',
    email: 'bob@example.com',
    role: 'customer',
    is_active: false,
    reviews_count: 0,
    created_at: '2026-11-10T00:00:00Z',
  },
  {
    id: 4,
    name: 'Charlie Smith',
    email: 'charlie@example.com',
    role: 'admin',
    is_active: true,
    reviews_count: 1,
    created_at: '2026-11-12T00:00:00Z',
  },
];

function renderAdminUsersPage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter>
          <AdminUsersPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.cookie = 'XSRF-TOKEN=test-csrf-token; path=/';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the users table and disables actions for current logged-in user', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
      if (url.includes('/admin/users')) {
        return jsonResponse({
          data: mockUsers,
          meta: { current_page: 1, last_page: 1, total: 4, per_page: 25 },
        });
      }
      return jsonResponse({ data: null }, 404);
    });

    renderAdminUsersPage();

    expect(await screen.findByText('Root Administrator')).toBeInTheDocument();
    expect(screen.getByText('Alice Green')).toBeInTheDocument();
    expect(screen.getByText('Bob White')).toBeInTheDocument();
    expect(screen.getByText('Charlie Smith')).toBeInTheDocument();

    // Verify "You" badge on Root Administrator
    expect(screen.getByText('You')).toBeInTheDocument();

    // The buttons for current user (id 1) should be disabled
    const selfRoleBtn = screen.getByTestId('toggle-role-btn-1');
    const selfStatusBtn = screen.getByTestId('toggle-status-btn-1');
    expect(selfRoleBtn).toBeDisabled();
    expect(selfStatusBtn).toBeDisabled();

    // The buttons for other users should be enabled
    const aliceRoleBtn = screen.getByTestId('toggle-role-btn-2');
    const aliceStatusBtn = screen.getByTestId('toggle-status-btn-2');
    expect(aliceRoleBtn).not.toBeDisabled();
    expect(aliceStatusBtn).not.toBeDisabled();
  });

  it('filters users by search and pills', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
      if (url.includes('/admin/users')) {
        return jsonResponse({
          data: mockUsers,
          meta: { current_page: 1, last_page: 1, total: 4, per_page: 25 },
        });
      }
      return jsonResponse({ data: null }, 404);
    });

    const user = userEvent.setup();
    renderAdminUsersPage();

    await screen.findByText('Alice Green');

    // Type in search
    const searchInput = screen.getByTestId('admin-users-search');
    await user.type(searchInput, 'Alice');

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('search=Alice'),
        expect.anything(),
      );
    });

    // Click Customers filter pill
    const customersPill = screen.getByRole('button', { name: 'Customers' });
    await user.click(customersPill);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('role=customer'),
        expect.anything(),
      );
    });

    // Click Deactivated filter pill
    const deactivatedPill = screen.getByRole('button', { name: 'Deactivated' });
    await user.click(deactivatedPill);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('is_active=0'),
        expect.anything(),
      );
    });
  });

  it('opens status dialog and deactivates a user', async () => {
    let patched = false;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
      const method = init?.method ?? 'GET';

      if (url.includes('/sanctum/csrf-cookie')) {
        return jsonResponse({}, 204);
      }

      if (url.includes('/admin/users/2') && method === 'PATCH') {
        patched = true;
        return jsonResponse({
          data: { ...mockUsers[1], is_active: false },
        });
      }

      if (url.includes('/admin/users')) {
        return jsonResponse({
          data: patched ? [{ ...mockUsers[1], is_active: false }] : mockUsers,
          meta: { current_page: 1, last_page: 1, total: 4, per_page: 25 },
        });
      }
      return jsonResponse({ data: null }, 404);
    });

    const user = userEvent.setup();
    renderAdminUsersPage();

    await screen.findByText('Alice Green');

    // Click deactivate button for Alice
    const aliceDeactivateBtn = screen.getByTestId('toggle-status-btn-2');
    await user.click(aliceDeactivateBtn);

    // Verify dialog content
    expect(screen.getByText('Deactivate User Account')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to deactivate/)).toBeInTheDocument();

    // Confirm deactivation
    const confirmBtn = screen.getByTestId('confirm-status-btn');
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(patched).toBe(true);
    });
  });

  it('opens role dialog and changes user role', async () => {
    let rolePatched = false;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
      const method = init?.method ?? 'GET';

      if (url.includes('/sanctum/csrf-cookie')) {
        return jsonResponse({}, 204);
      }

      if (url.includes('/admin/users/2') && method === 'PATCH') {
        rolePatched = true;
        return jsonResponse({
          data: { ...mockUsers[1], role: 'admin' },
        });
      }

      if (url.includes('/admin/users')) {
        return jsonResponse({
          data: rolePatched ? [{ ...mockUsers[1], role: 'admin' }] : mockUsers,
          meta: { current_page: 1, last_page: 1, total: 4, per_page: 25 },
        });
      }
      return jsonResponse({ data: null }, 404);
    });

    const user = userEvent.setup();
    renderAdminUsersPage();

    await screen.findByText('Alice Green');

    // Click "Make Admin" button for Alice
    const makeAdminBtn = screen.getByTestId('toggle-role-btn-2');
    await user.click(makeAdminBtn);

    // Verify role dialog
    expect(screen.getByText('Change User Role')).toBeInTheDocument();
    expect(screen.getByText(/Grant administrator privileges to/)).toBeInTheDocument();

    // Confirm role change
    const confirmBtn = screen.getByTestId('confirm-role-btn');
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(rolePatched).toBe(true);
    });
  });

  it('displays error in dialog when backend rejects action', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
      const method = init?.method ?? 'GET';

      if (url.includes('/sanctum/csrf-cookie')) {
        return jsonResponse({}, 204);
      }

      if (url.includes('/admin/users/4') && method === 'PATCH') {
        return jsonResponse(
          {
            error: {
              code: 'validation_failed',
              message: 'Cannot deactivate or demote the last remaining active administrator.',
            },
          },
          422,
        );
      }

      if (url.includes('/admin/users')) {
        return jsonResponse({
          data: mockUsers,
          meta: { current_page: 1, last_page: 1, total: 4, per_page: 25 },
        });
      }
      return jsonResponse({ data: null }, 404);
    });

    const user = userEvent.setup();
    renderAdminUsersPage();

    await screen.findByText('Charlie Smith');

    // Click deactivate button for Charlie
    const charlieDeactivateBtn = screen.getByTestId('toggle-status-btn-4');
    await user.click(charlieDeactivateBtn);

    // Confirm
    const confirmBtn = screen.getByTestId('confirm-status-btn');
    await user.click(confirmBtn);

    // Verify error is shown in dialog
    expect(
      await screen.findByText('Cannot deactivate or demote the last remaining active administrator.'),
    ).toBeInTheDocument();
  });

  it('displays empty state when no users match', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
      if (url.includes('/admin/users')) {
        return jsonResponse({
          data: [],
          meta: { current_page: 1, last_page: 1, total: 0, per_page: 25 },
        });
      }
      return jsonResponse({ data: null }, 404);
    });

    renderAdminUsersPage();

    expect(await screen.findByText('No users found')).toBeInTheDocument();
  });
});
