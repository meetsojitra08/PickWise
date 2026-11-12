import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PriceTag } from '@/components/shared/PriceTag';

describe('PriceTag', () => {
  it('renders formatted currency price with tabular numerals', () => {
    render(<PriceTag price={{ amount: '84999.00', currency: 'INR' }} />);

    const price = screen.getByText('₹84,999');
    expect(price).toBeInTheDocument();
    expect(price).toHaveClass('tabular-nums');
    expect(screen.queryByText(/drop/i)).not.toBeInTheDocument();
  });

  it('renders strikethrough original price and positive drop badge when previous price is higher', () => {
    render(
      <PriceTag
        price={{ amount: '76499.00', currency: 'INR' }}
        previousPrice={{ amount: '89999.00', currency: 'INR' }}
      />,
    );

    expect(screen.getByText('₹76,499')).toBeInTheDocument();
    expect(screen.getByText('₹89,999')).toHaveClass('line-through');
    expect(screen.getByText('Original price')).toHaveClass('sr-only');
    expect(screen.getByText('15% drop')).toBeInTheDocument();
  });

  it('omits strikethrough and drop badge when previous price is not strictly higher or uses a different currency', () => {
    const { rerender } = render(
      <PriceTag
        price={{ amount: '89999.00', currency: 'INR' }}
        previousPrice={{ amount: '84999.00', currency: 'INR' }}
      />,
    );

    expect(screen.queryByText('₹84,999')).not.toBeInTheDocument();
    expect(screen.queryByText(/drop/i)).not.toBeInTheDocument();

    rerender(
      <PriceTag
        price={{ amount: '84999.00', currency: 'INR' }}
        previousPrice={{ amount: '1200.00', currency: 'USD' }}
      />,
    );

    expect(screen.queryByText('$1,200')).not.toBeInTheDocument();
    expect(screen.queryByText(/drop/i)).not.toBeInTheDocument();
  });
});
