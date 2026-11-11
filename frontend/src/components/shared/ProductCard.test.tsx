import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ProductCard } from '@/components/shared/ProductCard';
import type { ProductSummary } from '@/features/catalog/types/catalog';

const baseProduct: ProductSummary = {
  id: 14,
  name: 'Lenovo Yoga Slim 7 Pro 14 OLED',
  slug: 'lenovo-yoga-slim-7-pro-14',
  summary: '32GB RAM, 1TB SSD, and factory-calibrated OLED display.',
  price: {
    amount: '84999.00',
    currency: 'INR',
  },
  availability: 'in_stock',
  availability_label: 'In Stock',
  rating_avg: 4.7,
  rating_count: 38,
  value_score: 92,
  category: {
    id: 2,
    name: 'Laptops',
    slug: 'laptops',
  },
  brand: {
    id: 5,
    name: 'Lenovo',
    slug: 'lenovo',
    logo_url: '/storage/brands/lenovo.svg',
  },
  primary_image: {
    id: 101,
    url: '/storage/products/lenovo-yoga-slim-7-pro-14/front.svg',
    alt_text: 'Lenovo Yoga Slim 7 Pro 14 front view',
  },
  created_at: '2026-11-10T14:15:00Z',
};

function renderCard(ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={['/products']}>
      <Routes>
        <Route path="/products" element={ui} />
        <Route path="/products/:slug" element={<h1>Product Detail Page</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProductCard', () => {
  it('renders product photo, brand, value score, rating, price, and detail link', () => {
    renderCard(<ProductCard product={baseProduct} />);

    const image = screen.getByRole('img', {
      name: 'Lenovo Yoga Slim 7 Pro 14 front view',
    });
    expect(image).toHaveAttribute(
      'src',
      '/storage/products/lenovo-yoga-slim-7-pro-14/front.svg',
    );
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('width', '800');
    expect(image).toHaveAttribute('height', '600');

    expect(screen.getByText('Lenovo')).toBeInTheDocument();
    expect(screen.getByText('Value 92')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Lenovo Yoga Slim 7 Pro 14 OLED' }),
    ).toHaveAttribute('href', '/products/lenovo-yoga-slim-7-pro-14');
    expect(
      screen.getByText(
        '32GB RAM, 1TB SSD, and factory-calibrated OLED display.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'Rated 4.7 out of 5 based on 38 reviews',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('₹84,999')).toBeInTheDocument();
    expect(screen.queryByText('In Stock')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('falls back cleanly when primary_image is missing or fails to load', () => {
    const { rerender } = renderCard(
      <ProductCard
        product={{
          ...baseProduct,
          primary_image: null,
          value_score: null,
        }}
      />,
    );

    expect(screen.getByText('No photo available')).toBeInTheDocument();
    expect(screen.queryByText(/Value/)).not.toBeInTheDocument();

    rerender(
      <MemoryRouter initialEntries={['/products']}>
        <Routes>
          <Route
            path="/products"
            element={<ProductCard product={baseProduct} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    const image = screen.getByRole('img', {
      name: 'Lenovo Yoga Slim 7 Pro 14 front view',
    });
    fireEvent.error(image);

    expect(screen.getByText('No photo available')).toBeInTheDocument();
  });

  it('renders low-stock and out-of-stock status badges', () => {
    const { rerender } = renderCard(
      <ProductCard
        product={{
          ...baseProduct,
          availability: 'low_stock',
          availability_label: 'Low Stock',
        }}
      />,
    );

    expect(screen.getByText('Low Stock')).toBeInTheDocument();

    rerender(
      <MemoryRouter initialEntries={['/products']}>
        <Routes>
          <Route
            path="/products"
            element={
              <ProductCard
                product={{
                  ...baseProduct,
                  availability: 'out_of_stock',
                  availability_label: 'Out of Stock',
                }}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
  });

  it('handles wishlist and compare toggle buttons without navigating away', async () => {
    const user = userEvent.setup();
    const onWishlistToggle = vi.fn();
    const onCompareToggle = vi.fn();

    renderCard(
      <ProductCard
        product={baseProduct}
        isWishlisted={false}
        onWishlistToggle={onWishlistToggle}
        isCompared={true}
        compareDisabled={true}
        onCompareToggle={onCompareToggle}
      />,
    );

    const wishlistButton = screen.getByRole('button', {
      name: 'Add Lenovo Yoga Slim 7 Pro 14 OLED to wishlist',
    });
    const compareButton = screen.getByRole('button', {
      name: 'Remove Lenovo Yoga Slim 7 Pro 14 OLED from comparison',
    });

    expect(wishlistButton).toHaveAttribute('aria-pressed', 'false');
    expect(compareButton).toHaveAttribute('aria-pressed', 'true');
    // Already-compared item stays enabled even when max compare items is reached.
    expect(compareButton).toBeEnabled();

    await user.click(wishlistButton);
    await user.click(compareButton);

    expect(onWishlistToggle).toHaveBeenCalledWith(baseProduct);
    expect(onCompareToggle).toHaveBeenCalledWith(baseProduct);
    expect(
      screen.queryByRole('heading', { name: 'Product Detail Page' }),
    ).not.toBeInTheDocument();
  });

  it('disables adding to compare when compareDisabled is true and not already compared', () => {
    const onCompareToggle = vi.fn();

    renderCard(
      <ProductCard
        product={baseProduct}
        isCompared={false}
        compareDisabled={true}
        onCompareToggle={onCompareToggle}
      />,
    );

    const compareButton = screen.getByRole('button', {
      name: 'Add Lenovo Yoga Slim 7 Pro 14 OLED to comparison',
    });
    expect(compareButton).toBeDisabled();
  });
});
