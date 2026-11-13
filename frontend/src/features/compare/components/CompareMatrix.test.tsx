import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { ProductSummary } from '@/features/catalog/types/catalog';
import { CompareMatrix } from '@/features/compare/components/CompareMatrix';
import type { CompareMatrixData } from '@/features/compare/types/compare';

function buildProduct(id: number, name: string): ProductSummary {
  return {
    id,
    name,
    slug: name.toLowerCase().replaceAll(' ', '-'),
    summary: '',
    price: { amount: '84999.00', currency: 'INR' },
    availability: 'in_stock',
    availability_label: 'In Stock',
    rating_avg: 4.5,
    rating_count: 120,
    value_score: 80,
    category: { id: 5, name: 'Laptops', slug: 'laptops' },
    brand: null,
    primary_image: null,
    created_at: null,
  };
}

const lenovo = buildProduct(14, 'Lenovo Yoga');
const macbook = buildProduct(22, 'MacBook Air');

const matrix: CompareMatrixData = {
  category: { id: 5, name: 'Laptops', slug: 'laptops' },
  products: [lenovo, macbook],
  rows: [
    {
      key: 'ram_gb',
      label: 'RAM',
      unit: 'GB',
      data_type: 'number',
      higher_is_better: true,
      winner_product_id: macbook.id,
      values: [
        { product_id: lenovo.id, value: 16 },
        { product_id: macbook.id, value: 32 },
      ],
    },
    {
      key: 'panel',
      label: 'Panel',
      unit: null,
      data_type: 'text',
      higher_is_better: null,
      winner_product_id: null,
      values: [
        { product_id: lenovo.id, value: 'OLED' },
        { product_id: macbook.id, value: 'IPS' },
      ],
    },
    {
      key: 'touchscreen',
      label: 'Touchscreen',
      unit: null,
      data_type: 'boolean',
      higher_is_better: true,
      winner_product_id: macbook.id,
      values: [
        { product_id: lenovo.id, value: null },
        { product_id: macbook.id, value: true },
      ],
    },
    {
      key: 'warranty',
      label: 'Warranty',
      unit: 'year',
      data_type: 'number',
      higher_is_better: true,
      winner_product_id: null,
      values: [
        { product_id: lenovo.id, value: 1 },
        { product_id: macbook.id, value: 1 },
      ],
    },
  ],
};

function renderMatrix(data: CompareMatrixData = matrix) {
  return render(
    <MemoryRouter>
      <CompareMatrix matrix={data} />
    </MemoryRouter>,
  );
}

describe('CompareMatrix', () => {
  it('renders values, units, missing values and per-row winners', () => {
    renderMatrix();

    expect(
      screen.getByRole('link', { name: 'Lenovo Yoga' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Laptops · 4 specs compared')).toBeInTheDocument();

    const ramRow = screen.getByRole('row', { name: /RAM/ });
    expect(within(ramRow).getByText('16')).toBeInTheDocument();
    expect(within(ramRow).getByText('32')).toBeInTheDocument();
    expect(within(ramRow).getAllByText('GB')).toHaveLength(2);
    expect(within(ramRow).getByText('Best')).toBeInTheDocument();

    const panelRow = screen.getByRole('row', { name: /Panel/ });
    expect(within(panelRow).queryByText('Best')).not.toBeInTheDocument();

    const touchscreenRow = screen.getByRole('row', { name: /Touchscreen/ });
    expect(within(touchscreenRow).getByText('Not listed')).toBeInTheDocument();
    expect(within(touchscreenRow).getByText('Yes')).toBeInTheDocument();
  });

  it('shows only rows that differ and restores all rows when turned off', async () => {
    const user = userEvent.setup();
    renderMatrix();

    const toggle = screen.getByRole('checkbox', {
      name: /Show only differences/,
    });

    await user.click(toggle);

    expect(screen.queryByRole('row', { name: /Warranty/ })).toBeNull();
    expect(screen.getByRole('row', { name: /RAM/ })).toBeInTheDocument();

    await user.click(toggle);

    expect(screen.getByRole('row', { name: /Warranty/ })).toBeInTheDocument();
  });

  it('explains when there are no differences to show', async () => {
    const user = userEvent.setup();
    renderMatrix({ ...matrix, rows: [matrix.rows[3]] });

    await user.click(
      screen.getByRole('checkbox', { name: /Show only differences/ }),
    );

    expect(
      screen.getByText(/These products match on every listed spec/),
    ).toBeInTheDocument();
  });
});
