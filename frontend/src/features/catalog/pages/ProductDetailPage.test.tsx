import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductDetailRoute } from '@/features/catalog/pages/ProductDetailPage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
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

function renderProductPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/products/northstar-studio-14']}>
        <Routes>
          <Route path="/products/:slug" element={<ProductDetailRoute />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProductDetailRoute', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders product facts, gallery, ordered specs and a safe store link', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ data: product }),
    );

    renderProductPage();

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

  it('persists wishlist and compare selections and handles missing images and specs', async () => {
    const minimalProduct = {
      ...product,
      images: [],
      primary_image: null,
      specs: [],
      availability: 'out_of_stock',
      availability_label: 'Out of Stock',
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ data: minimalProduct }),
    );

    renderProductPage();
    await screen.findByRole('heading', { level: 1, name: product.name });
    expect(screen.getByText('No photo available')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Specifications are not available for this product yet.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Add to wishlist' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Add to comparison' }),
    );
    await waitFor(() => {
      expect(
        JSON.parse(window.localStorage.getItem('pickwise:wishlist') ?? '[]'),
      ).toEqual([14]);
      expect(
        JSON.parse(window.localStorage.getItem('pickwise:compare') ?? '[]'),
      ).toEqual([14]);
    });
    expect(
      screen.getByRole('button', { name: 'Remove from wishlist' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Remove from comparison' }),
    ).toHaveAttribute('aria-pressed', 'true');
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
