import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountPage } from '@/features/account/pages/AccountPage';
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

const baseUser: User = {
  id: 7,
  name: 'Rohan Mehta',
  email: 'rohan@example.com',
  role: 'customer',
  preferences: {
    budget_default: 90000,
    favourite_categories: ['laptops', 'removed-category'],
    priorities: ['price', 'battery'],
  },
  is_active: true,
  email_verified_at: null,
  created_at: '2026-11-11T10:00:00Z',
};

function renderAccountRoutes(initialEntries: string[] = ['/account']) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route path="/account" element={<AccountPage />} />
            </Route>
            <Route path="/products" element={<h1>Browse Products</h1>} />
            <Route path="/compare" element={<h1>Compare Page</h1>} />
            <Route path="/assistant" element={<h1>Assistant Page</h1>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AccountPage', () => {
  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=test-token; path=/';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.cookie =
      'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    vi.restoreAllMocks();
  });

  it('renders all account tabs, respects ?tab=wishlist, and switches tabs cleanly', async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: baseUser }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [],
          meta: { current_page: 1, per_page: 48, total: 0, last_page: 1 },
          links: {},
        }),
      );

    renderAccountRoutes(['/account?tab=wishlist']);

    const tablist = await screen.findByRole('tablist', {
      name: 'Account sections',
    });

    expect(
      within(tablist).getByRole('tab', { name: 'Wishlist' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      within(tablist).getByRole('tab', { name: 'Saved comparisons' }),
    ).toBeInTheDocument();
    expect(
      within(tablist).getByRole('tab', { name: 'Conversations' }),
    ).toBeInTheDocument();
    expect(
      within(tablist).getByRole('tab', { name: 'Preferences' }),
    ).toBeInTheDocument();
    expect(
      within(tablist).getByRole('tab', { name: 'Profile' }),
    ).toBeInTheDocument();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Your wishlist is empty',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Browse products' }),
    ).toHaveAttribute('href', '/products');

    await user.click(
      within(tablist).getByRole('tab', { name: 'Saved comparisons' }),
    );
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'No saved comparisons yet',
      }),
    ).toBeInTheDocument();

    await user.click(
      within(tablist).getByRole('tab', { name: 'Conversations' }),
    );
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'No assistant conversations yet',
      }),
    ).toBeInTheDocument();

    await user.click(within(tablist).getByRole('tab', { name: 'Preferences' }));
    expect(
      screen.getByRole('heading', { level: 2, name: 'Shopping preferences' }),
    ).toBeInTheDocument();

    await user.click(within(tablist).getByRole('tab', { name: 'Profile' }));
    expect(
      screen.getByRole('heading', { level: 2, name: 'Profile details' }),
    ).toBeInTheDocument();
  });

  it('validates and updates profile details and surfaces duplicate email 422 errors', async () => {
    const user = userEvent.setup();
    const updatedUser: User = {
      ...baseUser,
      name: 'Rohan K. Mehta',
      email: 'rohan.k@example.com',
    };

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: baseUser }))
      .mockResolvedValueOnce(jsonResponse({ data: updatedUser }))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: 'validation_failed',
              message: 'The email has already been taken.',
              details: { email: ['The email has already been taken.'] },
            },
          },
          422,
        ),
      );

    renderAccountRoutes(['/account']);

    const nameInput = await screen.findByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');

    await user.clear(nameInput);
    await user.type(nameInput, 'R');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(
      screen.getByText('Name must be at least 2 characters.'),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.clear(nameInput);
    await user.type(nameInput, 'Rohan K. Mehta');
    await user.clear(emailInput);
    await user.type(emailInput, 'rohan.k@example.com');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Profile updated.',
    );
    expect(
      screen.getByText(/Rohan K\. Mehta · rohan\.k@example\.com/),
    ).toBeInTheDocument();

    await user.clear(emailInput);
    await user.type(emailInput, 'taken@example.com');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => {
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });
    expect(emailInput).toHaveAccessibleDescription(
      'The email has already been taken.',
    );
  });

  it('validates password rules, handles wrong current password 422, and resets on success', async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: baseUser }))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: 'validation_failed',
              message: 'The current password is incorrect.',
              details: {
                current_password: ['The current password is incorrect.'],
              },
            },
          },
          422,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({ data: { message: 'Password updated.' } }),
      );

    renderAccountRoutes(['/account']);

    const currentPasswordInput =
      await screen.findByLabelText('Current password');
    const newPasswordInput = screen.getByLabelText('New password');
    const confirmPasswordInput = screen.getByLabelText('Confirm new password');

    await user.type(currentPasswordInput, 'SamePassword123!');
    await user.type(newPasswordInput, 'SamePassword123!');
    await user.type(confirmPasswordInput, 'SamePassword123!');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    expect(
      screen.getByText(
        'New password must be different from your current password.',
      ),
    ).toBeInTheDocument();

    await user.clear(currentPasswordInput);
    await user.type(currentPasswordInput, 'WrongCurrent123!');
    await user.clear(newPasswordInput);
    await user.type(newPasswordInput, 'BrandNewPass456!');
    await user.clear(confirmPasswordInput);
    await user.type(confirmPasswordInput, 'BrandNewPass456!');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => {
      expect(currentPasswordInput).toHaveAttribute('aria-invalid', 'true');
    });
    expect(currentPasswordInput).toHaveAccessibleDescription(
      'The current password is incorrect.',
    );

    await user.clear(currentPasswordInput);
    await user.type(currentPasswordInput, 'ActualCurrent123!');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Password updated.',
    );
    expect(currentPasswordInput).toHaveValue('');
    expect(newPasswordInput).toHaveValue('');
    expect(confirmPasswordInput).toHaveValue('');
  });

  it('loads preferences, ignores removed categories gracefully, enforces 5 priorities, saves, and clears', async () => {
    const user = userEvent.setup();

    const savedUser: User = {
      ...baseUser,
      preferences: {
        budget_default: 65000,
        favourite_categories: ['laptops', 'monitors'],
        priorities: [
          'price',
          'battery',
          'performance',
          'display',
          'USB-C charging',
        ],
      },
    };

    const clearedUser: User = {
      ...baseUser,
      preferences: null,
    };

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: baseUser }))
      .mockResolvedValueOnce(jsonResponse({ data: savedUser }))
      .mockResolvedValueOnce(jsonResponse({ data: clearedUser }));

    renderAccountRoutes(['/account?tab=preferences']);

    const budgetInput = await screen.findByLabelText('Default budget (₹)');
    expect(budgetInput).toHaveValue(90000);

    const categoryGroup = screen.getByRole('group', {
      name: 'Favourite categories',
    });
    expect(
      within(categoryGroup).getByRole('button', { name: 'Laptops' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('2 / 5 selected')).toBeInTheDocument();

    // Negative budget shows Zod error without hitting API.
    await user.clear(budgetInput);
    await user.type(budgetInput, '-50');
    await user.click(screen.getByRole('button', { name: 'Save preferences' }));
    expect(
      screen.getByText('Default budget must be 0 or more.'),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.clear(budgetInput);
    await user.type(budgetInput, '65000');

    await user.click(
      within(categoryGroup).getByRole('button', { name: 'Monitors' }),
    );

    const priorityGroup = screen.getByRole('group', {
      name: 'Shopping priorities',
    });
    await user.click(
      within(priorityGroup).getByRole('button', { name: 'Performance' }),
    );
    await user.click(
      within(priorityGroup).getByRole('button', { name: 'Display quality' }),
    );
    await user.type(
      screen.getByLabelText('Add a custom priority (optional)'),
      'USB-C charging',
    );
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('5 / 5 selected')).toBeInTheDocument();
    expect(
      within(priorityGroup).getByRole('button', { name: 'Portability' }),
    ).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Save preferences' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Preferences saved.',
    );

    const putCalls = fetchMock.mock.calls.filter(
      ([url]) => url === '/api/v1/account/preferences',
    );
    expect(putCalls).toHaveLength(1);
    expect(JSON.parse(String(putCalls[0]?.[1]?.body))).toEqual({
      budget_default: 65000,
      favourite_categories: ['laptops', 'monitors'],
      priorities: [
        'price',
        'battery',
        'performance',
        'display',
        'USB-C charging',
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Clear preferences' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Preferences cleared.',
      );
    });
    expect(budgetInput).toHaveValue(null);
    expect(screen.getByText('0 / 5 selected')).toBeInTheDocument();
    expect(
      screen.getByText(/No default preferences saved yet\./),
    ).toBeInTheDocument();
  });
});
