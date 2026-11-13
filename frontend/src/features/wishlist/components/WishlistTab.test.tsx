import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthContext,
  type AuthContextValue,
} from '@/features/auth/hooks/auth-context';
import type { User } from '@/features/auth/types/auth';
import type { ProductSummary } from '@/features/catalog/types/catalog';
import { WishlistTab } from '@/features/wishlist/components/WishlistTab';

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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function wishlistPayload(products: ProductSummary[]) {
  return {
    data: products.map((product, index) => ({
      id: index + 1,
      product,
      created_at: '2026-11-12T10:00:00Z',
    })),
    meta: {
      current_page: 1,
      per_page: 48,
      total: products.length,
      last_page: 1,
    },
    links: {},
  };
}

function renderWishlistTab() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authenticatedAuth}>
        <MemoryRouter initialEntries={['/account?tab=wishlist']}>
          <WishlistTab />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('WishlistTab', () => {
  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=test-token; path=/';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.cookie =
      'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    vi.restoreAllMocks();
  });

  it('lists saved products newest first with prices and availability', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(wishlistPayload([laptop, monitor])),
    );

    renderWishlistTab();

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Saved products' }),
    ).toBeInTheDocument();
    expect(screen.getByText('2 saved products')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: laptop.name })).toHaveAttribute(
      'href',
      '/products/product-14',
    );
    expect(screen.getByRole('link', { name: monitor.name })).toHaveAttribute(
      'href',
      '/products/product-22',
    );
    expect(screen.getAllByText('₹89,999')).toHaveLength(2);
    expect(screen.getAllByText('In Stock')).toHaveLength(2);
    expect(
      screen.getAllByRole('button', { name: /Remove .* from wishlist/ }),
    ).toHaveLength(2);
  });

  it('shows the empty state as an invitation to browse', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(wishlistPayload([])),
    );

    renderWishlistTab();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Your wishlist is empty',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Heart a product to keep it here.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Browse products' }),
    ).toHaveAttribute('href', '/products');
  });

  it('shows an error with retry and recovers', async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: 'internal_error',
              message: 'Something went wrong.',
            },
          },
          500,
        ),
      )
      .mockResolvedValueOnce(jsonResponse(wishlistPayload([])));

    renderWishlistTab();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Your wishlist could not load',
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Your wishlist is empty',
      }),
    ).toBeInTheDocument();
  });

  it('removes an item optimistically and confirms with the API', async () => {
    const user = userEvent.setup();
    let products = [laptop, monitor];

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (_input, init) => {
        if (init?.method === 'DELETE') {
          products = products.filter((product) => product.id !== laptop.id);
          return new Response(null, { status: 204 });
        }

        return jsonResponse(wishlistPayload(products));
      });

    renderWishlistTab();

    const removeButton = await screen.findByRole('button', {
      name: `Remove ${laptop.name} from wishlist`,
    });
    await waitFor(() => expect(removeButton).toBeEnabled());

    await user.click(removeButton);

    await waitFor(() => {
      expect(
        screen.queryByRole('link', { name: laptop.name }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText('1 saved product')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/wishlist/14',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
    expect(
      screen.getByRole('link', { name: monitor.name }),
    ).toBeInTheDocument();
  });
});
