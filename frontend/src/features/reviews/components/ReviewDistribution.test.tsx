import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReviewDistribution } from '@/features/reviews/components/ReviewDistribution';
import type { RatingDistribution } from '@/features/reviews/types/reviews';

function distribution(values: Partial<RatingDistribution>): RatingDistribution {
  return {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    ...values,
  };
}

describe('ReviewDistribution', () => {
  it('shows the average, total and a bar for every star rating', () => {
    render(
      <ReviewDistribution distribution={distribution({ 5: 6, 4: 3, 3: 1 })} />,
    );

    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(
      screen.getByText('Based on 10 approved reviews.'),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('progressbar', { name: '5 star reviews' }),
    ).toHaveAttribute('aria-valuenow', '6');
    expect(
      screen.getByRole('progressbar', { name: '4 star reviews' }),
    ).toHaveAttribute('aria-valuenow', '3');
    expect(
      screen.getByRole('progressbar', { name: '1 star reviews' }),
    ).toHaveAttribute('aria-valuenow', '0');
  });

  it('keeps the summary readable when there are no approved reviews', () => {
    render(<ReviewDistribution distribution={distribution({})} />);

    expect(screen.getByText('0.0')).toBeInTheDocument();
    expect(screen.getByText('No approved reviews yet.')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: '5 star reviews' }),
    ).toHaveAttribute('aria-valuemax', '0');
  });
});
