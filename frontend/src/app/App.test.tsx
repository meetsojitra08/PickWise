import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/app/App';
import { AppRoutes } from '@/app/AppRoutes';
import { ThemeProvider } from '@/app/ThemeProvider';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
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

const adminUser: User = {
  ...customerUser,
  id: 1,
  name: 'Neha Kapoor',
  email: 'neha@example.com',
  role: 'admin',
};

function renderRoute(initialEntries: string[]) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ThemeProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('App shell and route layouts', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.restoreAllMocks();
  });

  it('renders the app shell with header, skip link, home hero, and footer', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse(
        { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        401,
      ),
    );

    render(<App />);

    expect(
      screen.getByRole('link', { name: 'Skip to main content' }),
    ).toHaveAttribute('href', '#main-content');
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Decide what to buy, with the homework done.',
      }),
    ).toBeInTheDocument();
    expect(
      await within(header).findByRole('link', { name: 'Log in' }),
    ).toBeVisible();
  });

  it('toggles between light and dark theme on the document root', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse(
        { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        401,
      ),
    );

    render(<App />);

    const toggleButton = screen.getByRole('button', {
      name: 'Switch to dark theme',
    });

    await user.click(toggleButton);

    expect(document.documentElement).toHaveClass('dark');
    expect(
      screen.getByRole('button', { name: 'Switch to light theme' }),
    ).toBeInTheDocument();

    await user.click(toggleButton);

    expect(document.documentElement).not.toHaveClass('dark');
    expect(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    ).toBeInTheDocument();
  });

  it('uses AuthLayout without storefront header or footer on /login', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse(
        { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        401,
      ),
    );

    renderRoute(['/login']);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Log in to Pickwise',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    ).toBeInTheDocument();
  });

  it('redirects guests away from /account and customers away from /admin', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        401,
      ),
    );

    const guestView = renderRoute(['/account']);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Log in to Pickwise' }),
      ).toBeInTheDocument();
    });

    guestView.unmount();

    fetchMock.mockResolvedValueOnce(jsonResponse({ data: customerUser }));
    renderRoute(['/admin']);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Decide what to buy, with the homework done.',
        }),
      ).toBeInTheDocument();
    });
  });

  it('renders AdminLayout for active admin users on /admin', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse({ data: adminUser }),
    );

    renderRoute(['/admin']);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Admin overview',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Admin navigation' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Storefront' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('renders NotFoundPage inside AppLayout for unknown routes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse(
        { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        401,
      ),
    );

    renderRoute(['/does-not-exist']);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
