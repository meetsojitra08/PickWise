import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductCardSkeleton } from '@/components/shared/ProductCardSkeleton';

describe('ProductCardSkeleton', () => {
  it('renders hidden placeholder blocks matching the ProductCard aspect ratio and footer', () => {
    const { container } = render(<ProductCardSkeleton showActions />);

    const card = container.querySelector('[data-slot="product-card-skeleton"]');
    expect(card).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.aspect-4\\/3')).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThanOrEqual(8);
  });

  it('supports compact mode without summary or action placeholders', () => {
    const { container } = render(
      <ProductCardSkeleton showSummary={false} showActions={false} />,
    );

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(
      7,
    );
  });
});
