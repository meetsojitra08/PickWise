import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReviewSummaryCard } from '@/features/reviews/components/ReviewSummaryCard';
import type { ReviewSummary } from '@/features/reviews/types/reviews';

const summary: ReviewSummary = {
  summary:
    'Buyers praise the battery life and comfortable keyboard, while the speakers draw repeated criticism.',
  pros: ['Battery lasts a full workday', 'Comfortable keyboard'],
  cons: ['Average speakers'],
  sentiment: 'mixed',
  reviews_count: 18,
  generated_at: '2026-11-14T09:00:00Z',
};

describe('ReviewSummaryCard', () => {
  it('renders the saved summary, themes and its own review count', () => {
    render(<ReviewSummaryCard summary={summary} approvedReviewCount={21} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'What buyers say' }),
    ).toBeInTheDocument();
    expect(screen.getByText(summary.summary)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'What people like' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'What people dislike' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Battery lasts a full workday'),
    ).toBeInTheDocument();
    expect(screen.getByText('Average speakers')).toBeInTheDocument();
    expect(
      screen.getByText('Based on 18 approved reviews.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Mixed')).toBeInTheDocument();
    expect(screen.getByText('AI summary')).toBeInTheDocument();
  });

  it('shows the not-enough-reviews state below three approved reviews', () => {
    render(<ReviewSummaryCard summary={null} approvedReviewCount={2} />);

    expect(screen.getByText(/Not enough reviews yet/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'What buyers say' }),
    ).toBeInTheDocument();
  });

  it('stays hidden while a summary is pending for a product with enough reviews', () => {
    const { container } = render(
      <ReviewSummaryCard summary={null} approvedReviewCount={5} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ['positive', 'Mostly positive'],
    ['mixed', 'Mixed'],
    ['negative', 'Mostly negative'],
  ] as const)('labels %s sentiment as "%s"', (sentiment, label) => {
    render(
      <ReviewSummaryCard
        summary={{ ...summary, sentiment }}
        approvedReviewCount={summary.reviews_count}
      />,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
