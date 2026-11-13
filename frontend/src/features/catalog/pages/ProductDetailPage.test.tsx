import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthContext,
  type AuthContextValue,
} from '@/features/auth/hooks/auth-context';
import type { User } from '@/features/auth/types/auth';
import { ProductDetailRoute } from '@/features/catalog/pages/ProductDetailPage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const guestAuth: AuthContextValue = {
  user: null,
  status: 'unauthenticated',
  isLoading: false,
  isAuthenticated: false,
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
  ...guestAuth,
  user: customer,
  status: 'authenticated',
  isAuthenticated: true,
};

const emptyWishlistResponse = {
  data: [],
  meta: { current_page: 1, per_page: 48, total: 0, last_page: 1 },
  links: {},
};

const emptyReviewsResponse = {
  data: [],
  links: { first: null, last: null, prev: null, next: null },
  meta: {
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
    rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    own_pending_review: null,
    has_reviewed: false,
  },
};

function mockProductEndpoints(
  historyPoints: unknown[] = [],
  similarProducts: unknown[] = [],
) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const requestUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (requestUrl.includes('/price-history')) {
      return jsonResponse({ data: { currency: 'INR', points: historyPoints } });
    }
    if (requestUrl.includes('/similar')) {
      return jsonResponse({ data: similarProducts });
    }
    if (requestUrl.includes('/reviews')) {
      return jsonResponse(emptyReviewsResponse);
    }
    if (requestUrl.includes('/wishlist')) {
      return jsonResponse(emptyWishlistResponse);
    }
    return jsonResponse({ data: product });
  });
}

const product = {
  id: 14,
  name: 'Northstar Studio 14',
  slug: 'northstar-studio-14',
  summary: 'A capable laptop for creative work.',
  description: 'A longer product description.',
  price: { amount: '89999.00', currency: 'INR' },
  availability: 'in_stock',
  availability_label: 'In Stock',
  store_url: 'https://store.example.com/northstar-studio-14',
  rating_avg: 4.5,
  rating_count: 21,
  value_score: 87,
  category: { id: 1, name: 'Laptops', slug: 'laptops' },
  brand: { id: 1, name: 'Northstar', slug: 'northstar', logo_url: null },
  primary_image: {
    id: 10,
    url: 'https://images.example.com/studio-front.webp',
    alt_text: 'Northstar Studio laptop, front view',
  },
  images: [
    {
      id: 10,
      url: 'https://images.example.com/studio-front.webp',
      alt_text: 'Northstar Studio laptop, front view',
      sort_order: 0,
      is_primary: true,
    },
    {
      id: 11,
      url: 'https://images.example.com/studio-side.webp',
      alt_text: 'Northstar Studio laptop, side view',
      sort_order: 1,
      is_primary: false,
    },
  ],
  specs: [
    {
      key: 'memory',
      label: 'Memory',
      unit: 'GB',
      data_type: 'number',
      value: 32,
      is_comparable: true,
      higher_is_better: true,
    },
    {
      key: 'touchscreen',
      label: 'Touchscreen',
      unit: null,
      data_type: 'boolean',
      value: false,
      is_comparable: true,
      higher_is_better: null,
    },
  ],
  created_at: null,
};

function renderProductPage(auth: AuthContextValue = guestAuth) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={['/products/northstar-studio-14']}>
          <Routes>
            <Route path="/products/:slug" element={<ProductDetailRoute />} />
            <Route path="/login" element={<h1>Log in</h1>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ProductDetailRoute', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.cookie = 'XSRF-TOKEN=test-token; path=/';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.cookie =
      'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('renders product facts, gallery, ordered specs and a safe store link', async () => {
    mockProductEndpoints([
      {
        recorded_at: '2026-07-01',
        price: { amount: '99999.00', currency: 'INR' },
      },
      {
        recorded_at: '2026-10-01',
        price: { amount: '89999.00', currency: 'INR' },
      },
    ]);

    const { container } = renderProductPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: product.name }),
    ).toBeInTheDocument();
    expect(
      screen.getByAltText('Northstar Studio laptop, front view'),
    ).toBeVisible();
    expect(screen.getByText('In Stock')).toBeInTheDocument();
    expect(screen.getByText('Memory')).toBeInTheDocument();
    expect(screen.getByText('32')).toBeInTheDocument();
    expect(screen.getByText('GB')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByTitle(/40%.*30%.*30%/)).toHaveTextContent('Value score');
    expect(screen.getByTitle(/40%.*30%.*30%/)).toHaveAttribute(
      'title',
      expect.stringContaining('4-star baseline and five assumed reviews'),
    );
    expect(
      screen.getByRole('heading', { name: 'Price history' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('2 recorded prices over time.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Similar products' }),
    ).toBeInTheDocument();
    expect(screen.getByText('No similar products yet')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Ratings & reviews' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        'No reviews yet. Be the first to share your experience.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Log in to write a review' }),
    ).toHaveAttribute('href', '/login');
    expect(
      screen.getByRole('img', { name: /Price history from/ }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('circle.fill-accent')).toHaveLength(2);
    expect(screen.getByText('Lowest')).toBeInTheDocument();
    expect(screen.getByText('Highest')).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'Recorded prices and dates' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('₹89,999').length).toBeGreaterThan(0);

    const storeLink = screen.getAllByRole('link', {
      name: /view on store/i,
    })[0];
    expect(storeLink).toHaveAttribute('target', '_blank');
    expect(storeLink).toHaveAttribute('rel', 'noopener noreferrer');

    await userEvent.click(screen.getByRole('button', { name: 'Show photo 2' }));
    expect(
      screen.getByAltText('Northstar Studio laptop, side view'),
    ).toBeVisible();
  });

  it('keeps compare selections on the device and sends guests to log in for the wishlist', async () => {
    const minimalProduct = {
      ...product,
      images: [],
      primary_image: null,
      specs: [],
      availability: 'out_of_stock',
      availability_label: 'Out of Stock',
    };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const requestUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (requestUrl.includes('/price-history')) {
        return jsonResponse({ data: { currency: 'INR', points: [] } });
      }
      if (requestUrl.includes('/similar')) {
        return jsonResponse({ data: [] });
      }
      if (requestUrl.includes('/reviews')) {
        return jsonResponse(emptyReviewsResponse);
      }
      return jsonResponse({ data: minimalProduct });
    });

    renderProductPage();
    await screen.findByRole('heading', { level: 1, name: product.name });
    expect(screen.getByText('No photo available')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Specifications are not available for this product yet.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(
      await screen.findByText(
        'Price history is not available for this product yet.',
      ),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Add to comparison' }),
    );
    await waitFor(() => {
      expect(
        JSON.parse(window.localStorage.getItem('pickwise:compare') ?? '[]'),
      ).toEqual([14]);
    });
    expect(
      screen.getByRole('button', { name: 'Remove from comparison' }),
    ).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(
      screen.getByRole('button', { name: 'Add to wishlist' }),
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Log in' }),
    ).toBeInTheDocument();
    expect(
      JSON.parse(
        window.sessionStorage.getItem('pickwise:pending-wishlist') ?? '[]',
      ),
    ).toEqual([expect.objectContaining({ id: 14 })]);
  });

  it('saves and removes an authenticated wishlist item with optimistic heart state', async () => {
    let saved = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const requestUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const method = init?.method ?? 'GET';

      if (requestUrl.includes('/wishlist/') && method === 'DELETE') {
        saved = false;
        return new Response(null, { status: 204 });
      }
      if (requestUrl.endsWith('/api/v1/wishlist') && method === 'POST') {
        saved = true;
        return jsonResponse(
          {
            data: { id: 1, product, created_at: '2026-11-12T10:00:00Z' },
          },
          201,
        );
      }
      if (requestUrl.includes('/wishlist')) {
        return jsonResponse({
          data: saved
            ? [{ id: 1, product, created_at: '2026-11-12T10:00:00Z' }]
            : [],
          meta: {
            current_page: 1,
            per_page: 48,
            total: saved ? 1 : 0,
            last_page: 1,
          },
          links: {},
        });
      }
      if (requestUrl.includes('/price-history')) {
        return jsonResponse({ data: { currency: 'INR', points: [] } });
      }
      if (requestUrl.includes('/similar')) {
        return jsonResponse({ data: [] });
      }
      if (requestUrl.includes('/reviews')) {
        return jsonResponse(emptyReviewsResponse);
      }

      return jsonResponse({ data: product });
    });

    renderProductPage(authenticatedAuth);

    const addButton = await screen.findByRole('button', {
      name: 'Add to wishlist',
    });
    await waitFor(() => expect(addButton).toBeEnabled());

    await userEvent.click(addButton);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Remove from wishlist' }),
      ).toHaveAttribute('aria-pressed', 'true');
    });
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/wishlist',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    const removeButton = await screen.findByRole('button', {
      name: 'Remove from wishlist',
    });
    await waitFor(() => expect(removeButton).toBeEnabled());
    await userEvent.click(removeButton);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Add to wishlist' }),
      ).toHaveAttribute('aria-pressed', 'false');
    });
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/wishlist/14',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  it('renders a single price point without breaking the chart scale', async () => {
    mockProductEndpoints([
      {
        recorded_at: '2026-10-01',
        price: { amount: '89999.00', currency: 'INR' },
      },
    ]);

    const { container } = renderProductPage();

    expect(
      await screen.findByText('One recorded price so far.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Lowest')).toBeInTheDocument();
    expect(screen.getByText('Highest')).toBeInTheDocument();
    expect(container.querySelectorAll('circle.fill-accent')).toHaveLength(1);
  });

  it('shows matching product cards in the similar products section', async () => {
    const match = {
      ...product,
      id: 15,
      name: 'Northstar Creator 15',
      slug: 'northstar-creator-15',
      price: { amount: '94999.00', currency: 'INR' },
    };
    mockProductEndpoints([], [match]);

    renderProductPage();

    expect(
      await screen.findByRole('link', { name: 'Northstar Creator 15' }),
    ).toHaveAttribute('href', '/products/northstar-creator-15');
  });

  it('shows the product-specific 404 state for unknown slugs', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(
        { error: { code: 'not_found', message: 'Not found.' } },
        404,
      ),
    );

    renderProductPage();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: "This product isn't available.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Browse products' }),
    ).toHaveAttribute('href', '/products');
  });
});
