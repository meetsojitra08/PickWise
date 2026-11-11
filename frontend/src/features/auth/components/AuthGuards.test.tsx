import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { RequireAdmin } from '@/features/auth/components/RequireAdmin';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { RequireGuest } from '@/features/auth/components/RequireGuest';
import type { User } from '@/features/auth/types/auth';
import { resolveSafeRedirectPath } from '@/lib/safe-redirect';

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
  id: 2,
  name: 'Rohan Mehta',
  email: 'rohan@example.com',
  role: 'customer',
  preferences: null,
  is_active: true,
  email_verified_at: null,
  created_at: '2026-11-11T10:00:00Z',
};

const adminUser: User = {
  ...customerUser,
  id: 1,
  name: 'Admin',
  email: 'admin@example.com',
  role: 'admin',
};

function LoginProbe() {
  const location = useLocation();
  const redirectTarget = resolveSafeRedirectPath(location.state, '/');

  return (
    <div>
      <h1>Login Page</h1>
      <p data-testid="redirect-target">{redirectTarget}</p>
    </div>
  );
}

function renderGuardedRoutes(
  initialEntries: (string | { pathname: string; state?: unknown })[],
) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/" element={<h1>Home Page</h1>} />
            <Route element={<RequireGuest />}>
              <Route path="/login" element={<LoginProbe />} />
            </Route>
            <Route element={<RequireAuth />}>
              <Route path="/account" element={<h1>Account Page</h1>} />
            </Route>
            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<h1>Admin Page</h1>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('Auth route guards', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a loading fallback while auth state is resolving and redirects guests to /login with origin state', async () => {
    let resolveMe!: (response: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveMe = resolve;
        }),
    );

    renderGuardedRoutes(['/account?tab=wishlist']);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking your session…',
    );

    resolveMe(
      jsonResponse(
        { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        401,
      ),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Login Page' }),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId('redirect-target')).toHaveTextContent(
      '/account?tab=wishlist',
    );
  });

  it('allows authenticated customers into RequireAuth routes and redirects them away from RequireAdmin', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      jsonResponse({ data: customerUser }),
    );

    const accountView = renderGuardedRoutes(['/account']);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Account Page' }),
      ).toBeInTheDocument();
    });

    accountView.unmount();

    renderGuardedRoutes(['/admin']);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Home Page' }),
      ).toBeInTheDocument();
    });
  });

  it('allows active admins into RequireAdmin routes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse({ data: adminUser }),
    );

    renderGuardedRoutes(['/admin']);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Admin Page' }),
      ).toBeInTheDocument();
    });
  });

  it('redirects authenticated users away from RequireGuest routes to safe destinations', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      jsonResponse({ data: customerUser }),
    );

    const homeRedirectView = renderGuardedRoutes(['/login']);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Home Page' }),
      ).toBeInTheDocument();
    });

    homeRedirectView.unmount();

    renderGuardedRoutes([
      {
        pathname: '/login',
        state: { from: { pathname: '/account', search: '?tab=profile' } },
      },
    ]);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Account Page' }),
      ).toBeInTheDocument();
    });
  });

  it('rejects external or unsafe redirect paths in resolveSafeRedirectPath', () => {
    expect(resolveSafeRedirectPath({ from: 'https://evil.example' })).toBe('/');
    expect(resolveSafeRedirectPath({ from: '//evil.example' })).toBe('/');
    expect(resolveSafeRedirectPath({ from: '/login' })).toBe('/');
    expect(resolveSafeRedirectPath({ from: '/register' })).toBe('/');
    expect(
      resolveSafeRedirectPath({
        from: { pathname: '/compare', search: '?ids=1,2', hash: '#verdict' },
      }),
    ).toBe('/compare?ids=1,2#verdict');
  });
});
