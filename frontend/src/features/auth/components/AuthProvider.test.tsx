import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { User } from '@/features/auth/types/auth';
import { apiClient } from '@/lib/api-client';

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

const customerUser: User = {
  id: 10,
  name: 'Asha Verma',
  email: 'asha@example.com',
  role: 'customer',
  preferences: null,
  is_active: true,
  email_verified_at: null,
  created_at: '2026-11-11T10:00:00Z',
};

const adminUser: User = {
  ...customerUser,
  id: 1,
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin',
};

function AuthInspector() {
  const { user, status, isAuthenticated, isAdmin, login, register, logout } =
    useAuth();

  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="authenticated">{String(isAuthenticated)}</p>
      <p data-testid="admin">{String(isAdmin)}</p>
      <p data-testid="user-email">{user?.email ?? 'guest'}</p>
      <button
        type="button"
        onClick={() =>
          void login({ email: 'asha@example.com', password: 'password123' })
        }
      >
        Login
      </button>
      <button
        type="button"
        onClick={() =>
          void register({
            name: 'Asha Verma',
            email: 'asha@example.com',
            password: 'password123',
            password_confirmation: 'password123',
          })
        }
      >
        Register
      </button>
      <button type="button" onClick={() => void logout()}>
        Logout
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=test-token; path=/';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.cookie =
      'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('treats a 401 on /auth/me as an unauthenticated guest without crashing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse(
        { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        401,
      ),
    );

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <AuthProvider>
          <AuthInspector />
        </AuthProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('loading');

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('admin')).toHaveTextContent('false');
    expect(screen.getByTestId('user-email')).toHaveTextContent('guest');
  });

  it('hydrates an active admin session and flags isAdmin', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse({ data: adminUser }),
    );

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <AuthProvider>
          <AuthInspector />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('admin')).toHaveTextContent('true');
    expect(screen.getByTestId('user-email')).toHaveTextContent(
      'admin@example.com',
    );
  });

  it('updates cached auth state on login, register, and logout', async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (input === '/api/v1/auth/me') {
        return jsonResponse(
          { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
          401,
        );
      }

      if (input === '/api/v1/auth/login') {
        return jsonResponse({ data: customerUser });
      }

      if (input === '/api/v1/auth/register') {
        return jsonResponse({ data: customerUser }, 201);
      }

      if (input === '/api/v1/auth/logout') {
        return jsonResponse({ data: { message: 'Logged out.' } });
      }

      return jsonResponse({ data: null }, 404);
    });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <AuthProvider>
          <AuthInspector />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    });

    await user.click(screen.getByRole('button', { name: 'Login' }));
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });
    expect(screen.getByTestId('user-email')).toHaveTextContent(
      'asha@example.com',
    );

    await user.click(screen.getByRole('button', { name: 'Logout' }));
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    });
    expect(screen.getByTestId('user-email')).toHaveTextContent('guest');

    await user.click(screen.getByRole('button', { name: 'Register' }));
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });
  });

  it('clears the cached user when another API request returns 401', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: customerUser }))
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
          401,
        ),
      );

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <AuthProvider>
          <AuthInspector />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await expect(apiClient.get('/wishlist')).rejects.toMatchObject({
      status: 401,
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    });
  });
});
