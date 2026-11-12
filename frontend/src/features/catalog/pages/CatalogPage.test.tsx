import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogPage } from '@/features/catalog/pages/CatalogPage';

const hooks = vi.hoisted(() => ({
  useCatalogCategories: vi.fn(),
  useCatalogFacets: vi.fn(),
  useCatalogProducts: vi.fn(),
}));

vi.mock('@/features/catalog/hooks/use-catalog-data', () => hooks);

function LocationOutput() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

describe('CatalogPage', () => {
  beforeEach(() => {
    hooks.useCatalogCategories.mockReturnValue({
      data: {
        data: [
          {
            id: 1,
            parent_id: null,
            name: 'Laptops',
            slug: 'laptops',
            children: [],
          },
        ],
      },
    });
    hooks.useCatalogFacets.mockReturnValue({
      data: {
        data: {
          category: {
            id: 1,
            parent_id: null,
            name: 'Laptops',
            slug: 'laptops',
          },
          price_range: { min: null, max: null },
          brands: [],
          availability: [],
          specs: [],
        },
      },
    });
    hooks.useCatalogProducts.mockReturnValue({
      data: {
        data: [],
        meta: { total: 0, current_page: 1, last_page: 1, per_page: 24 },
      },
      isPending: false,
      isError: false,
    });
  });

  it('writes search and category filters to the URL', () => {
    render(
      <MemoryRouter initialEntries={['/products']}>
        <Routes>
          <Route
            path="/products"
            element={
              <>
                <CatalogPage />
                <LocationOutput />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Search products' }),
      { target: { value: 'gaming mouse' } },
    );
    expect(screen.getByTestId('location-search').textContent).toContain(
      'q=gaming+mouse',
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), {
      target: { value: 'laptops' },
    });
    expect(screen.getByTestId('location-search').textContent).toContain(
      'category=laptops',
    );
  });

  it('restores query filters and shows the empty state', () => {
    render(
      <MemoryRouter
        initialEntries={['/products?category=laptops&price_max=80000']}
      >
        <Routes>
          <Route path="/products" element={<CatalogPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'No products match these filters' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue(
      'laptops',
    );
    expect(screen.getByLabelText('Maximum')).toHaveValue('80000');
    expect(
      screen.getByRole('button', { name: 'Max price: 80000' }),
    ).toBeInTheDocument();
  });
});
