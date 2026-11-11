import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { RequireGuest } from '@/features/auth/components/RequireGuest';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import type { User } from '@/features/auth/types/auth';

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

function renderLoginRoutes(
  initialEntries: (string | { pathname: string; state?: unknown })[] = [
    '/login',
  ],
) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/" element={<h1>Home Page</h1>} />
            <Route path="/account" element={<h1>Account Wishlist Page</h1>} />
            <Route element={<RequireGuest />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=test-token; path=/';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.cookie =
      'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    vi.restoreAllMocks();
  });

  it('shows inline Zod validation errors and does not call the API on invalid input', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
          401,
        ),
      );

    renderLoginRoutes();

    await screen.findByRole('heading', {
      level: 1,
      name: 'Log in to Pickwise',
    });

    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAccessibleDescription('Email is required.');
    expect(passwordInput).toHaveAccessibleDescription('Password is required.');

    await user.type(emailInput, 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(
      screen.getByText('Enter a valid email address.'),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('toggles password visibility with accessible labels', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse(
        { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        401,
      ),
    );

    renderLoginRoutes();

    const passwordInput = await screen.findByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', {
      name: 'Show password',
    });
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(
      screen.getByRole('button', { name: 'Hide password' }),
    ).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('shows pending state, prevents double-submit, and redirects back on success', async () => {
    const user = userEvent.setup();
    let resolveLogin!: (response: Response) => void;

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input) => {
        if (input === '/api/v1/auth/me') {
          return Promise.resolve(
            jsonResponse(
              {
                error: { code: 'unauthenticated', message: 'Unauthenticated.' },
              },
              401,
            ),
          );
        }

        if (input === '/api/v1/auth/login') {
          return new Promise<Response>((resolve) => {
            resolveLogin = resolve;
          });
        }

        return Promise.resolve(jsonResponse({ data: null }, 404));
      });

    renderLoginRoutes([
      {
        pathname: '/login',
        state: { from: { pathname: '/account', search: '?tab=wishlist' } },
      },
    ]);

    const emailInput = await screen.findByLabelText('Email');
    await user.type(emailInput, '  rohan@example.com  ');
    await user.type(screen.getByLabelText('Password'), 'SecretPass123!');
    await user.click(
      screen.getByRole('checkbox', { name: 'Keep me logged in' }),
    );

    const submitButton = screen.getByRole('button', { name: 'Log in' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Logging in/i }),
      ).toBeDisabled();
    });

    const form = submitButton.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    const loginCalls = fetchMock.mock.calls.filter(
      ([url]) => url === '/api/v1/auth/login',
    );
    expect(loginCalls).toHaveLength(1);
    expect(JSON.parse(String(loginCalls[0]?.[1]?.body))).toEqual({
      email: 'rohan@example.com',
      password: 'SecretPass123!',
      remember: true,
    });

    resolveLogin(jsonResponse({ data: customerUser }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Account Wishlist Page',
        }),
      ).toBeInTheDocument();
    });
  });

  it('shows wrong credentials and rate-limit errors in an alert', async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
          401,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: 'validation_failed',
              message: 'Email or password is incorrect.',
              details: { email: ['Email or password is incorrect.'] },
            },
          },
          422,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: 'rate_limited',
              message: 'Too many attempts. Try again in a minute.',
            },
          },
          429,
        ),
      );

    renderLoginRoutes();

    await user.type(await screen.findByLabelText('Email'), 'rohan@example.com');
    await user.type(screen.getByLabelText('Password'), 'WrongPass123!');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email or password is incorrect.',
    );

    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Too many attempts. Try again in a minute.',
      );
    });
  });

  it('redirects already authenticated visitors away from /login and preserves origin state to /register', async () => {
    const user = userEvent.setup();

    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: customerUser }));

    const authedView = renderLoginRoutes(['/login']);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Home Page' }),
      ).toBeInTheDocument();
    });

    authedView.unmount();

    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        401,
      ),
    );

    renderLoginRoutes([
      {
        pathname: '/login',
        state: { from: '/account' },
      },
    ]);

    await user.click(
      await screen.findByRole('link', { name: 'Create an account' }),
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Create your account' }),
    ).toBeInTheDocument();
  });
});
