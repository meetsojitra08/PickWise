import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RatingStars } from '@/components/shared/RatingStars';

describe('RatingStars', () => {
  it('renders accessible label, half-star state, numeric score, and review count', () => {
    const { container } = render(<RatingStars rating={4.65} count={42} />);

    expect(
      screen.getByRole('img', {
        name: 'Rated 4.7 out of 5 based on 42 reviews',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('4.7')).toHaveClass('font-medium');
    expect(screen.getByText('(42)')).toBeInTheDocument();

    // 4.65 rounds to 4.5 visually: 4 full stars, 1 half star, 0 empty stars
    expect(container.querySelectorAll('[data-star-state="full"]')).toHaveLength(
      4,
    );
    expect(container.querySelectorAll('[data-star-state="half"]')).toHaveLength(
      1,
    );
    expect(
      container.querySelectorAll('[data-star-state="empty"]'),
    ).toHaveLength(0);
    expect(container.querySelector('[style]')).toBeNull();
  });

  it('handles singular review count and omitted count', () => {
    const { rerender } = render(<RatingStars rating={5} count={1} />);

    expect(
      screen.getByRole('img', { name: 'Rated 5.0 out of 5 based on 1 review' }),
    ).toBeInTheDocument();

    rerender(<RatingStars rating={3.5} />);

    expect(
      screen.getByRole('img', { name: 'Rated 3.5 out of 5' }),
    ).toBeInTheDocument();
    expect(screen.getByText('3.5')).toBeInTheDocument();
  });

  it('shows a calm empty-reviews label when count is zero and clamps out-of-range ratings', () => {
    const { rerender, container } = render(
      <RatingStars rating={0} count={0} />,
    );

    expect(
      screen.getByRole('img', { name: 'No customer reviews yet' }),
    ).toBeInTheDocument();
    expect(screen.getByText('No reviews')).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-star-state="empty"]'),
    ).toHaveLength(5);

    rerender(<RatingStars rating={9.2} count={3} />);
    expect(
      screen.getByRole('img', {
        name: 'Rated 5.0 out of 5 based on 3 reviews',
      }),
    ).toBeInTheDocument();

    rerender(<RatingStars rating={-2} count={2} />);
    expect(
      screen.getByRole('img', {
        name: 'Rated 0.0 out of 5 based on 2 reviews',
      }),
    ).toBeInTheDocument();
  });
});
