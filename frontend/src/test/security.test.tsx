import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductFacts } from '@/features/catalog/components/ProductFacts';
import type { ProductDetail } from '@/features/catalog/types/catalog-api';
import { getSafeExternalUrl } from '@/lib/safe-url';

const baseProduct: ProductDetail = {
  id: 1,
  name: 'Northstar Studio 14',
  slug: 'northstar-studio-14',
  summary: 'Quiet 14-inch workstation laptop.',
  description: 'Built for everyday productivity.',
  price: { amount: '1299.00', currency: 'USD' },
  availability: 'in_stock',
  availability_label: 'In stock',
  store_url: 'https://store.example.com/northstar-studio-14',
  rating_avg: 4.6,
  rating_count: 14,
  value_score: 88,
  category: { id: 1, name: 'Laptops', slug: 'laptops' },
  brand: { id: 1, name: 'Northstar', slug: 'northstar', logo_url: null },
  primary_image: null,
  images: [],
  specs: [],
  review_summary: null,
  created_at: '2026-10-01T00:00:00Z',
};

describe('getSafeExternalUrl', () => {
  it('allows explicit http and https URLs', () => {
    expect(getSafeExternalUrl('https://store.example.com/item?id=1')).toBe(
      'https://store.example.com/item?id=1',
    );
    expect(getSafeExternalUrl('  http://example.com/path  ')).toBe(
      'http://example.com/path',
    );
  });

  it.each([
    'javascript:alert(1)',
    'JAVASCRIPT:alert(document.cookie)',
    '  javascript:void(0)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    '/relative/path',
    'not a url',
    '',
    '   ',
    null,
    undefined,
  ])('blocks unsafe or invalid URL: %s', (unsafeUrl) => {
    expect(getSafeExternalUrl(unsafeUrl)).toBeNull();
  });
});

describe('ProductFacts store link XSS hardening', () => {
  it('does not render an anchor when store_url uses an unsafe scheme', () => {
    render(
      <ProductFacts
        product={{ ...baseProduct, store_url: 'javascript:alert(1)' }}
        isWishlisted={false}
        wishlistPending={false}
        isCompared={false}
        compareDisabled={false}
        onWishlistToggle={vi.fn()}
        onCompareToggle={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole('link', { name: /view on store/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /store link unavailable/i }),
    ).toBeDisabled();
  });

  it('renders a safe external anchor with noopener noreferrer for https URLs', () => {
    render(
      <ProductFacts
        product={baseProduct}
        isWishlisted={false}
        wishlistPending={false}
        isCompared={false}
        compareDisabled={false}
        onWishlistToggle={vi.fn()}
        onCompareToggle={vi.fn()}
      />,
    );

    const link = screen.getByRole('link', { name: /view on store/i });
    expect(link).toHaveAttribute(
      'href',
      'https://store.example.com/northstar-studio-14',
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
