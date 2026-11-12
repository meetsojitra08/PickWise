import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductGridSkeleton } from '@/components/shared/ProductGridSkeleton';

describe('ProductGridSkeleton', () => {
  it('renders the requested number of skeleton cards with an accessible status announcement', () => {
    const { container } = render(
      <ProductGridSkeleton count={6} label="Loading matching laptops" />,
    );

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading matching laptops')).toHaveClass('sr-only');
    expect(
      container.querySelectorAll('[data-slot="product-card-skeleton"]'),
    ).toHaveLength(6);
  });
});
