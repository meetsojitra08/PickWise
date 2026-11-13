import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductSummary } from '@/features/catalog/types/catalog';
import { SharedComparisonPage } from '@/features/compare/pages/SharedComparisonPage';
import type { CompareMatrixData } from '@/features/compare/types/compare';
import { ApiError } from '@/lib/api-error';

const sharedHook = vi.hoisted(() => ({
  useSharedComparison: vi.fn(),
}));

vi.mock('@/features/compare/hooks/use-saved-comparisons', () => sharedHook);

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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/compare/shared/test-token']}>
      <Routes>
        <Route
          path="/compare/shared/:token"
          element={<SharedComparisonPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SharedComparisonPage', () => {
  beforeEach(() => {
    sharedHook.useSharedComparison.mockReset();
  });

  it('renders the shared name and read-only matrix', () => {
    sharedHook.useSharedComparison.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        data: { name: 'Editing shortlist', unavailable_count: 0, matrix },
      },
    });

    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Editing shortlist' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Lenovo Yoga' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'MacBook Air' }),
    ).toBeInTheDocument();
    expect(sharedHook.useSharedComparison).toHaveBeenCalledWith('test-token');
    expect(
      screen.queryByRole('button', { name: /save comparison/i }),
    ).not.toBeInTheDocument();
  });

  it('explains products removed from the shared comparison', () => {
    sharedHook.useSharedComparison.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        data: {
          name: 'Editing shortlist',
          unavailable_count: 1,
          matrix,
        },
      },
    });

    renderPage();

    expect(
      screen.getByText(/1 product is no longer available/),
    ).toBeInTheDocument();
  });

  it('shows an error when the link is no longer shareable', () => {
    sharedHook.useSharedComparison.mockReturnValue({
      isPending: false,
      isError: true,
      error: new ApiError({
        status: 404,
        code: 'not_found',
        message: 'Resource not found.',
      }),
    });

    renderPage();

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: "This comparison isn't available",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Compare products yourself' }),
    ).toHaveAttribute('href', '/products');
  });

  it('shows a skeleton while the shared matrix loads', () => {
    sharedHook.useSharedComparison.mockReturnValue({
      isPending: true,
      isError: false,
    });

    renderPage();

    expect(
      screen.getByRole('status', { name: 'Loading comparison' }),
    ).toBeInTheDocument();
  });

  it('explains when no products remain to compare', () => {
    sharedHook.useSharedComparison.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        data: { name: 'Old picks', unavailable_count: 2, matrix: null },
      },
    });

    renderPage();

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'These products are no longer available',
      }),
    ).toBeInTheDocument();
  });
});
