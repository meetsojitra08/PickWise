import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthContext,
  type AuthContextValue,
} from '@/features/auth/hooks/auth-context';
import type { User } from '@/features/auth/types/auth';
import { ProductReviews } from '@/features/reviews/components/ProductReviews';
import type { Review } from '@/features/reviews/types/reviews';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const customer: User = {
  id: 7,
  name: 'Asha Rao',
  email: 'asha@example.com',
  role: 'customer',
  preferences: null,
  is_active: true,
  email_verified_at: null,
  created_at: '2026-01-01T00:00:00Z',
};

function authValue(authenticated: boolean): AuthContextValue {
  return {
    user: authenticated ? customer : null,
    status: authenticated ? 'authenticated' : 'unauthenticated',
    isLoading: false,
    isAuthenticated: authenticated,
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

const pendingReview: Review = {
  id: 501,
  rating: 4,
  title: 'Great value',
  body: 'A detailed review of this product.',
  status: 'pending',
  author_name: 'Asha Rao',
  is_own: true,
  created_at: '2026-11-12T10:00:00Z',
};

const reviewsWithPendingResponse = {
  data: [pendingReview],
  links: { first: null, last: null, prev: null, next: null },
  meta: {
    current_page: 1,
    per_page: 10,
    total: 1,
    last_page: 1,
    rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    own_pending_review: pendingReview,
    has_reviewed: true,
  },
};

function renderReviews(authenticated: boolean) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue(authenticated)}>
        <MemoryRouter>
          <ProductReviews slug="northstar-studio-14" />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ProductReviews', () => {
  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=test-token; path=/';
  });

  afterEach(() => {
    document.cookie =
      'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    vi.restoreAllMocks();
  });

  it('invites guests to log in while still showing the rating summary', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(emptyReviewsResponse),
    );

    renderReviews(false);

    expect(
      await screen.findByRole('heading', { name: 'Ratings & reviews' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: 'Log in to write a review' }),
    ).toHaveAttribute('href', '/login');
    expect(
      await screen.findByText('No approved reviews yet.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'No reviews yet. Be the first to share your experience.',
      ),
    ).toBeInTheDocument();
  });

  it('submits a review and shows the pending state after the list refreshes', async () => {
    const user = userEvent.setup();
    let hasReview = false;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (_input, init) => {
        if (init?.method === 'POST') {
          hasReview = true;
          return jsonResponse({ data: pendingReview }, 201);
        }

        return jsonResponse(
          hasReview ? reviewsWithPendingResponse : emptyReviewsResponse,
        );
      });

    renderReviews(true);

    expect(
      await screen.findByRole('heading', { name: 'Write a review' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    await user.type(screen.getByLabelText('Title'), 'Great value');
    await user.type(
      screen.getByLabelText('Review'),
      'A detailed review of this product.',
    );
    await user.click(screen.getByRole('button', { name: 'Submit review' }));

    await waitFor(() => {
      expect(
        screen.getByText('Your review is awaiting approval'),
      ).toBeInTheDocument();
    });
    expect(screen.getByText('Awaiting approval')).toBeInTheDocument();

    const postCall = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      rating: 4,
      title: 'Great value',
      body: 'A detailed review of this product.',
    });
  });
});
