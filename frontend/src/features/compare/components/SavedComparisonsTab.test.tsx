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
import type { ProductSummary } from '@/features/catalog/types/catalog';
import { CompareProvider } from '@/features/compare/components/CompareProvider';
import { SavedComparisonsTab } from '@/features/compare/components/SavedComparisonsTab';
import { COMPARE_STORAGE_KEY } from '@/features/compare/lib/compare-storage';
import type { SavedComparison } from '@/features/compare/types/saved-comparison';

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
    throw new Error('Not implemented in this test.');
  },
  register: async () => {
    throw new Error('Not implemented in this test.');
  },
  logout: async () => {},
  refetchUser: async () => null,
};

function buildProduct(id: number, name: string): ProductSummary {
  return {
    id,
    name,
    slug: `product-${id}`,
    summary: `Summary for ${name}.`,
    price: { amount: '89999.00', currency: 'INR' },
    availability: 'in_stock',
    availability_label: 'In Stock',
    rating_avg: 4.5,
    rating_count: 21,
    value_score: 87,
    category: { id: 1, name: 'Laptops', slug: 'laptops' },
    brand: { id: 1, name: 'Northstar', slug: 'northstar', logo_url: null },
    primary_image: null,
    created_at: null,
  };
}

const laptop = buildProduct(14, 'Northstar Studio 14');
const monitor = buildProduct(22, 'Northstar View 27');

function buildComparison(
  overrides: Partial<SavedComparison> = {},
): SavedComparison {
  return {
    id: 5,
    name: 'Editing shortlist',
    share_token: null,
    is_shared: false,
    item_count: 2,
    unavailable_count: 0,
    items: [laptop, monitor],
    created_at: '2026-11-12T10:00:00Z',
    updated_at: '2026-11-12T10:00:00Z',
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function listPayload(comparisons: SavedComparison[]) {
  return {
    data: comparisons,
    meta: {
      current_page: 1,
      per_page: 12,
      total: comparisons.length,
      last_page: 1,
    },
    links: {},
  };
}

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authenticatedAuth}>
        <CompareProvider>
          <MemoryRouter initialEntries={['/account?tab=comparisons']}>
            <Routes>
              <Route path="/account" element={<SavedComparisonsTab />} />
              <Route path="/compare" element={<h1>Compare page</h1>} />
            </Routes>
          </MemoryRouter>
        </CompareProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('SavedComparisonsTab', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = 'XSRF-TOKEN=test-token; path=/';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.localStorage.clear();
    document.cookie =
      'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    vi.restoreAllMocks();
  });

  it('lists saved comparisons with products and creates a share link', async () => {
    const user = userEvent.setup();
    let shared = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.startsWith('/api/v1/comparisons?') && method === 'GET') {
        return jsonResponse(
          listPayload([
            buildComparison(
              shared
                ? {
                    share_token: 'a'.repeat(32),
                    is_shared: true,
                  }
                : {},
            ),
          ]),
        );
      }

      if (url.endsWith('/share') && method === 'POST') {
        shared = true;
        return jsonResponse({ data: { share_token: 'a'.repeat(32) } });
      }

      if (url.endsWith('/share') && method === 'DELETE') {
        shared = false;
        return new Response(null, { status: 204 });
      }

      return jsonResponse({}, 404);
    });

    renderTab();

    expect(
      await screen.findByRole('heading', {
        level: 3,
        name: 'Editing shortlist',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 saved comparison')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: laptop.name })).toHaveAttribute(
      'href',
      '/products/product-14',
    );
    expect(
      screen.getByRole('link', { name: monitor.name }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Share' }));

    const shareInput = await screen.findByLabelText('Read-only share link');
    expect(shareInput).toHaveValue(
      `${window.location.origin}/compare/shared/${'a'.repeat(32)}`,
    );

    await user.click(screen.getByRole('button', { name: 'Stop sharing' }));

    expect(
      await screen.findByRole('button', { name: 'Share' }),
    ).toBeInTheDocument();
  });

  it('copies the read-only link and explains hidden products', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(
        listPayload([
          buildComparison({
            share_token: 'b'.repeat(32),
            is_shared: true,
            item_count: 2,
            unavailable_count: 1,
          }),
        ]),
      ),
    );

    renderTab();

    expect(
      await screen.findByText(/1 product is no longer available/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copy link' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        `${window.location.origin}/compare/shared/${'b'.repeat(32)}`,
      );
    });
    expect(
      await screen.findByRole('button', { name: 'Copied' }),
    ).toBeInTheDocument();
  });

  it('reopens a comparison in the tray', async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(listPayload([buildComparison()])),
    );

    renderTab();

    await user.click(
      await screen.findByRole('button', { name: 'Open comparison' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Compare page' }),
    ).toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem(COMPARE_STORAGE_KEY) ?? '[]'),
    ).toEqual([
      expect.objectContaining({ id: laptop.id }),
      expect.objectContaining({ id: monitor.id }),
    ]);
  });

  it('deletes a comparison after confirmation', async () => {
    const user = userEvent.setup();
    let deleted = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.startsWith('/api/v1/comparisons?') && method === 'GET') {
        return jsonResponse(listPayload(deleted ? [] : [buildComparison()]));
      }

      if (url === '/api/v1/comparisons/5' && method === 'DELETE') {
        deleted = true;
        return new Response(null, { status: 204 });
      }

      return jsonResponse({}, 404);
    });

    renderTab();

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }));

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'No saved comparisons yet',
      }),
    ).toBeInTheDocument();
  });
});
