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

const newCustomer: User = {
  id: 14,
  name: 'Asha Verma',
  email: 'asha@example.com',
  role: 'customer',
  preferences: null,
  is_active: true,
  email_verified_at: null,
  created_at: '2026-11-11T10:00:00Z',
};

function renderRegisterRoutes(
  initialEntries: (string | { pathname: string; state?: unknown })[] = [
    '/register',
  ],
) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/" element={<h1>Home Page</h1>} />
            <Route path="/account" element={<h1>Account Page</h1>} />
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

describe('RegisterPage', () => {
  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=test-token; path=/';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.cookie =
      'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    vi.restoreAllMocks();
  });

  it('validates name, email, password length, and password confirmation with Zod', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
          401,
        ),
      );

    renderRegisterRoutes();

    await screen.findByRole('heading', {
      level: 1,
      name: 'Create your account',
    });

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(
      screen.getByText('Please confirm your password.'),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Name'), ' A ');
    await user.type(screen.getByLabelText('Email'), 'invalid');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.type(screen.getByLabelText('Confirm password'), 'different');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      screen.getByText('Name must be at least 2 characters.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Enter a valid email address.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Password must be at least 8 characters.'),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), 'StrongPass123!');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('toggles password and confirm password visibility independently', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse(
        { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        401,
      ),
    );

    renderRegisterRoutes();

    const passwordInput = await screen.findByLabelText('Password');
    const confirmInput = screen.getByLabelText('Confirm password');

    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(confirmInput).toHaveAttribute('type', 'password');

    await user.click(
      screen.getByRole('button', { name: 'Show confirm password' }),
    );
    expect(confirmInput).toHaveAttribute('type', 'text');
  });

  it('registers a customer, prevents double-submit, and redirects to destination', async () => {
    const user = userEvent.setup();
    let resolveRegister!: (response: Response) => void;

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

        if (input === '/api/v1/auth/register') {
          return new Promise<Response>((resolve) => {
            resolveRegister = resolve;
          });
        }

        return Promise.resolve(jsonResponse({ data: null }, 404));
      });

    renderRegisterRoutes([
      {
        pathname: '/register',
        state: { from: '/account' },
      },
    ]);

    await user.type(await screen.findByLabelText('Name'), '  Asha Verma  ');
    await user.type(screen.getByLabelText('Email'), '  asha@example.com  ');
    await user.type(screen.getByLabelText('Password'), 'SecretPass123!');
    await user.type(
      screen.getByLabelText('Confirm password'),
      'SecretPass123!',
    );

    const submitButton = screen.getByRole('button', { name: 'Create account' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Creating account/i }),
      ).toBeDisabled();
    });

    const form = submitButton.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    const registerCalls = fetchMock.mock.calls.filter(
      ([url]) => url === '/api/v1/auth/register',
    );
    expect(registerCalls).toHaveLength(1);
    expect(JSON.parse(String(registerCalls[0]?.[1]?.body))).toEqual({
      name: 'Asha Verma',
      email: 'asha@example.com',
      password: 'SecretPass123!',
      password_confirmation: 'SecretPass123!',
    });

    resolveRegister(jsonResponse({ data: newCustomer }, 201));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Account Page' }),
      ).toBeInTheDocument();
    });
  });

  it('maps server 422 field errors onto inputs and shows 429 throttle alert', async () => {
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
              message: 'The email has already been taken.',
              details: {
                email: ['The email has already been taken.'],
              },
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
              message:
                'Too many registration attempts. Please try again later.',
            },
          },
          429,
        ),
      );

    renderRegisterRoutes();

    await user.type(await screen.findByLabelText('Name'), 'Asha Verma');
    await user.type(screen.getByLabelText('Email'), 'taken@example.com');
    await user.type(screen.getByLabelText('Password'), 'SecretPass123!');
    await user.type(
      screen.getByLabelText('Confirm password'),
      'SecretPass123!',
    );
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByText('The email has already been taken.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Too many registration attempts. Please try again later.',
      );
    });
  });
});
