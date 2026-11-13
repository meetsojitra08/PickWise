import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

function renderPage(items: ProductSummary[]) {
  window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(items));

  return render(
    <CompareProvider>
      <MemoryRouter initialEntries={['/compare']}>
        <ComparePage />
      </MemoryRouter>
    </CompareProvider>,
  );
}

describe('ComparePage', () => {
  beforeEach(() => {
    window.localStorage.clear();
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
