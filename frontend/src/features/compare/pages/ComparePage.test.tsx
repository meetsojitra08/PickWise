import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthContext,
  type AuthContextValue,
} from '@/features/auth/hooks/auth-context';
import type { User } from '@/features/auth/types/auth';
import type { ProductSummary } from '@/features/catalog/types/catalog';
import { CompareProvider } from '@/features/compare/components/CompareProvider';
import { COMPARE_STORAGE_KEY } from '@/features/compare/lib/compare-storage';
import { ComparePage } from '@/features/compare/pages/ComparePage';
import type { CompareMatrixData } from '@/features/compare/types/compare';
import { ApiError } from '@/lib/api-error';

const matrixHook = vi.hoisted(() => ({
  useCompareMatrix: vi.fn(),
}));

vi.mock('@/features/compare/hooks/use-compare-matrix', () => matrixHook);

function buildProduct(id: number, name: string): ProductSummary {
  return {
    id,
    name,
    slug: name.toLowerCase().replaceAll(' ', '-'),
    summary: '',
    price: { amount: '84999.00', currency: 'INR' },
    availability: 'in_stock',
    availability_label: 'In Stock',
    rating_avg: 4.5,
    rating_count: 120,
    value_score: 80,
    category: { id: 5, name: 'Laptops', slug: 'laptops' },
    brand: null,
    primary_image: null,
    created_at: null,
  };
}

const lenovo = buildProduct(14, 'Lenovo Yoga');
const macbook = buildProduct(22, 'MacBook Air');

const matrix: CompareMatrixData = {
  category: { id: 5, name: 'Laptops', slug: 'laptops' },
  products: [lenovo, macbook],
  rows: [
    {
      key: 'ram_gb',
      label: 'RAM',
      unit: 'GB',
      data_type: 'number',
      higher_is_better: true,
      winner_product_id: macbook.id,
      values: [
        { product_id: lenovo.id, value: 16 },
        { product_id: macbook.id, value: 32 },
      ],
    },
  ],
};

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

const memberAuth: AuthContextValue = {
  ...guestAuth,
  user: customer,
  status: 'authenticated',
  isAuthenticated: true,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderPage(
  items: ProductSummary[],
  auth: AuthContextValue = guestAuth,
) {
  window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(items));
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <CompareProvider>
          <MemoryRouter initialEntries={['/compare']}>
            <ComparePage />
          </MemoryRouter>
        </CompareProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ComparePage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = 'XSRF-TOKEN=test-token; path=/';
    matrixHook.useCompareMatrix.mockReset();
  });

  it('invites the shopper to pick two products when the tray is empty', () => {
    matrixHook.useCompareMatrix.mockReturnValue({
      isPending: true,
      isError: false,
    });

    renderPage([]);

    expect(
      screen.getByRole('heading', {
        name: 'Pick at least two products to compare.',
      }),
    ).toBeInTheDocument();
    expect(matrixHook.useCompareMatrix).toHaveBeenCalledWith([]);
  });

  it('asks for one more product when only one is selected', () => {
    matrixHook.useCompareMatrix.mockReturnValue({
      isPending: true,
      isError: false,
    });

    renderPage([lenovo]);

    expect(
      screen.getByText(
        'Add one more product from the same category to see them side by side.',
      ),
    ).toBeInTheDocument();
  });

  it('shows a skeleton while the matrix loads', () => {
    matrixHook.useCompareMatrix.mockReturnValue({
      isPending: true,
      isError: false,
    });

    renderPage([lenovo, macbook]);

    expect(
      screen.getByRole('status', { name: 'Loading comparison' }),
    ).toBeInTheDocument();
  });

  it('renders the matrix for the products in the tray', () => {
    matrixHook.useCompareMatrix.mockReturnValue({
      isPending: false,
      isError: false,
      data: { data: matrix },
    });

    renderPage([lenovo, macbook]);

    expect(
      screen.getByRole('link', { name: 'Lenovo Yoga' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'MacBook Air' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Laptops · 1 spec compared')).toBeInTheDocument();
  });

  it('invites a guest to sign in before saving the comparison', () => {
    matrixHook.useCompareMatrix.mockReturnValue({
      isPending: false,
      isError: false,
      data: { data: matrix },
    });

    renderPage([lenovo, macbook]);

    expect(
      screen.getByRole('link', { name: 'Sign in to save' }),
    ).toHaveAttribute('href', '/login');
  });

  it('saves a named comparison for a signed-in shopper', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        const method = init?.method ?? 'GET';

        if (url === '/api/v1/comparisons' && method === 'POST') {
          return jsonResponse({ data: { id: 5 } }, 201);
        }

        if (url.startsWith('/api/v1/comparisons?')) {
          return jsonResponse({
            data: [],
            meta: {
              current_page: 1,
              per_page: 12,
              total: 0,
              last_page: 1,
            },
            links: {},
          });
        }

        return jsonResponse({}, 404);
      });

    matrixHook.useCompareMatrix.mockReturnValue({
      isPending: false,
      isError: false,
      data: { data: matrix },
    });

    renderPage([lenovo, macbook], memberAuth);

    await user.type(
      screen.getByLabelText('Name this comparison'),
      'Editing shortlist',
    );
    await user.click(screen.getByRole('button', { name: 'Save comparison' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/comparisons',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    const postCall = fetchMock.mock.calls.find(
      ([url, init]) => url === '/api/v1/comparisons' && init?.method === 'POST',
    );

    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      name: 'Editing shortlist',
      product_ids: [lenovo.id, macbook.id],
    });
    expect(
      await screen.findByRole('link', {
        name: 'View your saved comparisons',
      }),
    ).toHaveAttribute('href', '/account?tab=comparisons');
  });

  it('explains a cross-category comparison and can clear the tray', async () => {
    const user = userEvent.setup();
    matrixHook.useCompareMatrix.mockReturnValue({
      isPending: false,
      isError: true,
      error: new ApiError({
        status: 422,
        code: 'validation_failed',
        message: 'The given data was invalid.',
        details: {
          product_ids: [
            'Products from different categories cannot be compared.',
          ],
        },
      }),
      refetch: vi.fn(),
    });

    renderPage([lenovo, macbook]);

    expect(
      screen.getByRole('heading', { name: "These products can't be compared" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Products from different categories cannot be compared.',
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear comparison' }));

    expect(
      screen.getByRole('heading', {
        name: 'Pick at least two products to compare.',
      }),
    ).toBeInTheDocument();
  });

  it('offers a retry when the request fails', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    matrixHook.useCompareMatrix.mockReturnValue({
      isPending: false,
      isError: true,
      error: new ApiError({
        status: 500,
        code: 'internal_error',
        message: 'Something went wrong on our side. Please try again.',
      }),
      refetch,
    });

    renderPage([lenovo, macbook]);

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
