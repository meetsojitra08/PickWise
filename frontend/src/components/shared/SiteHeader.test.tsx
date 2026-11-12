import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/app/ThemeProvider';
import { SiteHeader } from '@/components/shared/SiteHeader';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
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
  id: 5,
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

function renderHeader(initialEntries: string[] = ['/']) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ThemeProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <SiteHeader />
            <Routes>
              <Route path="/" element={<h1>Home Page</h1>} />
              <Route path="/products" element={<h1>Browse Page</h1>} />
              <Route path="/compare" element={<h1>Compare Page</h1>} />
              <Route path="/assistant" element={<h1>Assistant Page</h1>} />
              <Route path="/login" element={<h1>Login Page</h1>} />
              <Route element={<RequireAuth />}>
                <Route path="/account" element={<h1>Account Page</h1>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('SiteHeader', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.cookie = 'XSRF-TOKEN=test-token; path=/';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.cookie =
      'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    vi.restoreAllMocks();
  });

  it('renders primary navigation, active route indicator, and Log in CTA for guests', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse(
        { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        401,
      ),
    );

    renderHeader(['/products']);

    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('link', { name: 'Browse' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      within(nav).getByRole('link', { name: 'Compare' }),
    ).not.toHaveAttribute('aria-current');
    expect(
      within(nav).getByRole('link', { name: 'Assistant' }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Search products' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Wishlist' })).toHaveAttribute(
      'href',
      '/account?tab=wishlist',
    );
    expect(await screen.findByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('shows customer menu items without Admin and logs out cleanly from /account', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (input === '/api/v1/auth/me') {
        return Promise.resolve(jsonResponse({ data: customerUser }));
      }

      if (input === '/api/v1/auth/logout') {
        return Promise.resolve(jsonResponse({ message: 'Logged out.' }));
      }

      return Promise.resolve(jsonResponse({ data: null }, 404));
    });

    renderHeader(['/account']);

    const menuButton = await screen.findByRole('button', {
      name: 'Account menu for Rohan Mehta',
    });
    expect(
      screen.getByRole('heading', { name: 'Account Page' }),
    ).toBeInTheDocument();

    await user.click(menuButton);

    expect(screen.getByRole('menuitem', { name: 'Account' })).toHaveAttribute(
      'href',
      '/account',
    );
    expect(screen.getByRole('menuitem', { name: 'Wishlist' })).toHaveAttribute(
      'href',
      '/account?tab=wishlist',
    );
    expect(
      screen.queryByRole('menuitem', { name: 'Admin' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: 'Log out' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Home Page' }),
      ).toBeInTheDocument();
    });

    expect(await screen.findByRole('link', { name: 'Log in' })).toBeVisible();
  });

  it('keeps the user on a public route when logging out from /products', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (input === '/api/v1/auth/me') {
        return Promise.resolve(jsonResponse({ data: customerUser }));
      }

      if (input === '/api/v1/auth/logout') {
        return Promise.resolve(jsonResponse({ message: 'Logged out.' }));
      }

      return Promise.resolve(jsonResponse({ data: null }, 404));
    });

    renderHeader(['/products']);

    const menuButton = await screen.findByRole('button', {
      name: 'Account menu for Rohan Mehta',
    });
    await user.click(menuButton);
    await user.click(screen.getByRole('menuitem', { name: 'Log out' }));

    expect(await screen.findByRole('link', { name: 'Log in' })).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Browse Page' }),
    ).toBeInTheDocument();
  });

  it('shows the Admin menu item for admin users', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse({ data: adminUser }),
    );

    renderHeader(['/']);

    const menuButton = await screen.findByRole('button', {
      name: 'Account menu for Neha Kapoor',
    });
    await user.click(menuButton);

    expect(screen.getByRole('menuitem', { name: 'Admin' })).toHaveAttribute(
      'href',
      '/admin',
    );
  });

  it('opens the mobile navigation drawer and closes when a destination is selected', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse(
        { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        401,
      ),
    );

    renderHeader(['/']);

    const trigger = screen.getByRole('button', {
      name: 'Open navigation menu',
    });
    await user.click(trigger);

    const mobileNav = await screen.findByRole('navigation', {
      name: 'Mobile navigation',
    });
    expect(
      within(mobileNav).getByRole('link', { name: 'Log in' }),
    ).toBeVisible();

    await user.click(within(mobileNav).getByRole('link', { name: 'Compare' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Compare Page' }),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole('navigation', { name: 'Mobile navigation' }),
    ).not.toBeInTheDocument();
  });
});
