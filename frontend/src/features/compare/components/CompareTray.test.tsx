import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductSummary } from '@/features/catalog/types/catalog';
import { CompareProvider } from '@/features/compare/components/CompareProvider';
import { CompareTray } from '@/features/compare/components/CompareTray';
import { COMPARE_STORAGE_KEY } from '@/features/compare/lib/compare-storage';

function buildProduct(id: number, name: string): ProductSummary {
  return {
    id,
    name,
    slug: name.toLowerCase().replaceAll(' ', '-'),
    summary: '',
    price: { amount: '1000.00', currency: 'INR' },
    availability: 'in_stock',
    availability_label: 'In Stock',
    rating_avg: 4.5,
    rating_count: 10,
    value_score: 80,
    category: { id: 1, name: 'Laptops', slug: 'laptops' },
    brand: null,
    primary_image: null,
    created_at: null,
  };
}

const laptopOne = buildProduct(1, 'Laptop One');
const laptopTwo = buildProduct(2, 'Laptop Two');

function renderTray(items: ProductSummary[]) {
  window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(items));

  return render(
    <CompareProvider>
      <MemoryRouter>
        <CompareTray />
      </MemoryRouter>
    </CompareProvider>,
  );
}

describe('CompareTray', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('stays hidden until a product is selected', () => {
    renderTray([]);

    expect(
      screen.queryByRole('complementary', { name: 'Compare tray' }),
    ).not.toBeInTheDocument();
  });

  it('asks for a second product and disables compare with one selection', () => {
    renderTray([laptopOne]);

    expect(
      screen.getByText('Pick at least two products to compare.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compare' })).toBeDisabled();
  });

  it('links to the compare page and removes products once two are selected', async () => {
    const user = userEvent.setup();
    renderTray([laptopOne, laptopTwo]);

    expect(screen.getByText('2 of 4 selected')).toBeInTheDocument();
    expect(screen.getByText('Laptop One')).toBeInTheDocument();
    expect(screen.getByText('Laptop Two')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Compare' })).toHaveAttribute(
      'href',
      '/compare',
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Remove Laptop One from comparison',
      }),
    );

    expect(screen.queryByText('Laptop One')).not.toBeInTheDocument();
    expect(
      screen.getByText('Pick at least two products to compare.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compare' })).toBeDisabled();
    expect(
      JSON.parse(window.localStorage.getItem(COMPARE_STORAGE_KEY) ?? '[]'),
    ).toEqual([expect.objectContaining({ id: 2 })]);
  });

  it('clears every selected product', async () => {
    const user = userEvent.setup();
    renderTray([laptopOne, laptopTwo]);

    await user.click(screen.getByRole('button', { name: 'Clear comparison' }));

    expect(
      screen.queryByRole('complementary', { name: 'Compare tray' }),
    ).not.toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem(COMPARE_STORAGE_KEY) ?? '[]'),
    ).toEqual([]);
  });
});
