import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductSummary } from '@/features/catalog/types/catalog';
import { CompareProvider } from '@/features/compare/components/CompareProvider';
import { useCompare } from '@/features/compare/hooks/use-compare';
import { useCompareToggle } from '@/features/compare/hooks/use-compare-toggle';
import { COMPARE_STORAGE_KEY } from '@/features/compare/lib/compare-storage';

function buildProduct(
  id: number,
  name: string,
  categoryId = 1,
): ProductSummary {
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
    category: {
      id: categoryId,
      name: categoryId === 1 ? 'Laptops' : 'Phones',
      slug: categoryId === 1 ? 'laptops' : 'phones',
    },
    brand: null,
    primary_image: null,
    created_at: null,
  };
}

const laptopOne = buildProduct(1, 'Laptop One');
const laptopTwo = buildProduct(2, 'Laptop Two');
const laptopThree = buildProduct(3, 'Laptop Three');
const laptopFour = buildProduct(4, 'Laptop Four');
const laptopFive = buildProduct(5, 'Laptop Five');
const phone = buildProduct(9, 'Phone One', 2);

function CompareProbe() {
  const { items, count, isFull, clear } = useCompare();
  const { toggle } = useCompareToggle();

  return (
    <div>
      <output data-testid="count">{count}</output>
      <output data-testid="full">{String(isFull)}</output>
      <output data-testid="ids">
        {items.map((item) => item.id).join(',')}
      </output>

      {[laptopOne, laptopTwo, laptopThree, laptopFour, laptopFive, phone].map(
        (product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => toggle(product)}
          >
            Add {product.name}
          </button>
        ),
      )}

      <button type="button" onClick={clear}>
        Clear
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <CompareProvider>
      <CompareProbe />
    </CompareProvider>,
  );
}

describe('CompareProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('adds and removes products and restores the tray from this device', async () => {
    const user = userEvent.setup();
    const view = renderProbe();

    await user.click(screen.getByRole('button', { name: 'Add Laptop One' }));
    await user.click(screen.getByRole('button', { name: 'Add Laptop Two' }));

    expect(screen.getByTestId('count')).toHaveTextContent('2');
    expect(screen.getByTestId('ids')).toHaveTextContent('1,2');

    view.unmount();
    renderProbe();

    expect(screen.getByTestId('count')).toHaveTextContent('2');
    expect(screen.getByTestId('ids')).toHaveTextContent('1,2');

    await user.click(screen.getByRole('button', { name: 'Add Laptop One' }));

    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('ids')).toHaveTextContent('2');
    expect(
      JSON.parse(window.localStorage.getItem(COMPARE_STORAGE_KEY) ?? '[]'),
    ).toEqual([expect.objectContaining({ id: 2 })]);
  });

  it('stops at four products and explains the limit', async () => {
    const user = userEvent.setup();
    const toastError = vi.spyOn(toast, 'error').mockReturnValue('');
    renderProbe();

    for (const product of [laptopOne, laptopTwo, laptopThree, laptopFour]) {
      await user.click(
        screen.getByRole('button', { name: `Add ${product.name}` }),
      );
    }

    expect(screen.getByTestId('count')).toHaveTextContent('4');
    expect(screen.getByTestId('full')).toHaveTextContent('true');

    await user.click(screen.getByRole('button', { name: 'Add Laptop Five' }));

    expect(screen.getByTestId('count')).toHaveTextContent('4');
    expect(screen.getByTestId('ids')).not.toHaveTextContent('5');
    expect(toastError).toHaveBeenCalledWith(
      'You can compare up to 4 products. Remove one to add another.',
    );
  });

  it('blocks mixing categories until the tray is cleared', async () => {
    const user = userEvent.setup();
    const toastError = vi.spyOn(toast, 'error').mockReturnValue('');
    renderProbe();

    await user.click(screen.getByRole('button', { name: 'Add Laptop One' }));
    await user.click(screen.getByRole('button', { name: 'Add Phone One' }));

    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(toastError).toHaveBeenCalledWith(
      'Compare products from the same category. Clear the tray to start a new comparison.',
    );

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await user.click(screen.getByRole('button', { name: 'Add Phone One' }));

    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('ids')).toHaveTextContent('9');
  });
});
