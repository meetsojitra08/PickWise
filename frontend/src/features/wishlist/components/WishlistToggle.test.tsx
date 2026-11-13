import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductCard } from '@/components/shared/ProductCard';
import {
  AuthContext,
  type AuthContextValue,
} from '@/features/auth/hooks/auth-context';
import type { User } from '@/features/auth/types/auth';
import type { ProductSummary } from '@/features/catalog/types/catalog';
import { WishlistIntentSync } from '@/features/wishlist/components/WishlistIntentSync';
import {
  useWishlist,
  useWishlistToggle,
} from '@/features/wishlist/hooks/use-wishlist';
import { rememberWishlistIntent } from '@/features/wishlist/lib/pending-wishlist-intents';

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

function buildAuth(isAuthenticated: boolean): AuthContextValue {
  return {
    user: isAuthenticated ? customer : null,
    status: isAuthenticated ? 'authenticated' : 'unauthenticated',
    isLoading: false,
    isAuthenticated,
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
}

const laptop: ProductSummary = {
  id: 14,
  name: 'Northstar Studio 14',
  slug: 'northstar-studio-14',
  summary: 'A capable laptop for creative work.',
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function wishlistPayload(saved: boolean) {
  return {
    data: saved
      ? [{ id: 1, product: laptop, created_at: '2026-11-12T10:00:00Z' }]
      : [],
    meta: {
      current_page: 1,
      per_page: 48,
      total: saved ? 1 : 0,
      last_page: 1,
    },
    links: {},
  };
}

function HeartHarness() {
  const wishlist = useWishlist();
  const { toggle, isToggling } = useWishlistToggle();

  return (
    <ProductCard
      product={laptop}
      isWishlisted={wishlist.savedIds.has(laptop.id)}
      wishlistPending={wishlist.isFetching || isToggling(laptop.id)}
      onWishlistToggle={(product) =>
        toggle(product, !wishlist.savedIds.has(product.id))
      }
    />
  );
}

function renderHarness(auth: AuthContextValue, element = <HeartHarness />) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={element} />
            <Route path="/login" element={<h1>Log in</h1>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('wishlist heart toggle', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    document.cookie = 'XSRF-TOKEN=test-token; path=/';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.sessionStorage.clear();
    document.cookie =
      'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    vi.restoreAllMocks();
  });

  it('adds optimistically before the save request resolves', async () => {
    const user = userEvent.setup();
    let saved = false;
    let resolvePost: (response: Response) => void = () => {};
    const pendingPost = new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (_input, init) => {
        const method = init?.method ?? 'GET';

        if (method === 'POST') {
          saved = true;
          return pendingPost;
        }

        return jsonResponse(wishlistPayload(saved));
      });

    renderHarness(buildAuth(true));

    const addButton = await screen.findByRole('button', {
      name: `Add ${laptop.name} to wishlist`,
    });
    await waitFor(() => expect(addButton).toBeEnabled());

    await user.click(addButton);

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: `Remove ${laptop.name} from wishlist`,
        }),
      ).toHaveAttribute('aria-pressed', 'true');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/wishlist',
      expect.objectContaining({ method: 'POST' }),
    );

    resolvePost(
      jsonResponse(
        {
          data: { id: 1, product: laptop, created_at: '2026-11-12T10:00:00Z' },
        },
        201,
      ),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: `Remove ${laptop.name} from wishlist`,
        }),
      ).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('rolls the heart back and toasts when the save fails', async () => {
    const user = userEvent.setup();
    const toastError = vi.spyOn(toast, 'error').mockReturnValue('');

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      if (init?.method === 'POST') {
        return jsonResponse(
          {
            error: {
              code: 'internal_error',
              message: 'Something went wrong.',
            },
          },
          500,
        );
      }

      return jsonResponse(wishlistPayload(false));
    });

    renderHarness(buildAuth(true));

    const addButton = await screen.findByRole('button', {
      name: `Add ${laptop.name} to wishlist`,
    });
    await waitFor(() => expect(addButton).toBeEnabled());

    await user.click(addButton);

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: `Add ${laptop.name} to wishlist`,
        }),
      ).toHaveAttribute('aria-pressed', 'false');
    });
    expect(toastError).toHaveBeenCalledWith(
      "Couldn't update your wishlist. Try again.",
    );
  });

  it('sends guests to log in and remembers what they hearted', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    renderHarness(buildAuth(false));

    const addButton = await screen.findByRole('button', {
      name: `Add ${laptop.name} to wishlist`,
    });
    await user.click(addButton);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Log in' }),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      JSON.parse(
        window.sessionStorage.getItem('pickwise:pending-wishlist') ?? '[]',
      ),
    ).toEqual([expect.objectContaining({ id: laptop.id })]);
  });

  it('saves the remembered product once the guest is logged in', async () => {
    rememberWishlistIntent(laptop);
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (_input, init) => {
        if (init?.method === 'POST') {
          return jsonResponse(
            {
              data: {
                id: 1,
                product: laptop,
                created_at: '2026-11-12T10:00:00Z',
              },
            },
            201,
          );
        }

        return jsonResponse(wishlistPayload(true));
      });

    renderHarness(buildAuth(true), <WishlistIntentSync />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/wishlist',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    expect(
      window.sessionStorage.getItem('pickwise:pending-wishlist'),
    ).toBeNull();
  });
});
