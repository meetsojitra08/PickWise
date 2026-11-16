import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminProductsPage } from './AdminProductsPage';
import type {
  AdminBrand,
  AdminCategory,
  AdminProduct,
  AdminProductImage,
  AdminSpecDefinition,
} from '../types';

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const mockCategories: AdminCategory[] = [
  {
    id: 1,
    parent_id: null,
    parent: null,
    name: 'Laptops',
    slug: 'laptops',
    description: 'Workstations and ultrabooks.',
    image_path: null,
    image_url: null,
    sort_order: 1,
    is_active: true,
    products_count: 5,
    spec_definitions_count: 2,
    children_count: 0,
    created_at: '2026-11-16T10:00:00Z',
    updated_at: '2026-11-16T10:00:00Z',
  },
];

const mockBrands: AdminBrand[] = [
  {
    id: 1,
    name: 'Apple',
    slug: 'apple',
    logo_path: null,
    logo_url: null,
    products_count: 3,
    created_at: '2026-11-16T10:00:00Z',
    updated_at: '2026-11-16T10:00:00Z',
  },
  {
    id: 2,
    name: 'Dell',
    slug: 'dell',
    logo_path: null,
    logo_url: null,
    products_count: 2,
    created_at: '2026-11-16T10:00:00Z',
    updated_at: '2026-11-16T10:00:00Z',
  },
];

const mockSpecs: AdminSpecDefinition[] = [
  {
    id: 10,
    category_id: 1,
    key: 'ram_gb',
    label: 'RAM Size',
    unit: 'GB',
    data_type: 'number',
    is_filterable: true,
    is_comparable: true,
    higher_is_better: true,
    sort_order: 1,
    product_specs_count: 5,
    created_at: '2026-11-16T10:00:00Z',
    updated_at: '2026-11-16T10:00:00Z',
  },
];

const mockProducts: AdminProduct[] = [
  {
    id: 101,
    category_id: 1,
    brand_id: 1,
    name: 'MacBook Pro 16',
    slug: 'macbook-pro-16',
    summary: 'Powerful M3 Max workstation laptop with Liquid Retina display.',
    description: 'Detailed workstation breakdown for developers and creators.',
    price: {
      amount: '2499.00',
      currency: 'USD',
      formatted: '$2,499.00',
    },
    currency: 'USD',
    availability: 'in_stock',
    availability_label: 'In Stock',
    store_url: 'https://apple.com/macbook-pro',
    rating_avg: 4.85,
    rating_count: 42,
    value_score: 92,
    is_published: true,
    is_deleted: false,
    category: { id: 1, name: 'Laptops', slug: 'laptops' },
    brand: { id: 1, name: 'Apple', slug: 'apple' },
    primary_image: {
      id: 1,
      url: '/storage/products/mbp16.webp',
      alt_text: 'Space Black MacBook Pro 16',
    },
    images: [],
    specs: [
      {
        id: 201,
        spec_definition_id: 10,
        key: 'ram_gb',
        label: 'RAM Size',
        unit: 'GB',
        data_type: 'number',
        value: 36,
        is_filterable: true,
        is_comparable: true,
        higher_is_better: true,
      },
    ],
    price_history: [],
    created_at: '2026-11-16T10:00:00Z',
    updated_at: '2026-11-16T10:00:00Z',
    deleted_at: null,
  },
  {
    id: 102,
    category_id: 1,
    brand_id: 2,
    name: 'Dell XPS 15',
    slug: 'dell-xps-15',
    summary: 'Sleek OLED laptop for creators.',
    description: 'Thin and light performance powerhouse.',
    price: {
      amount: '1899.00',
      currency: 'USD',
      formatted: '$1,899.00',
    },
    currency: 'USD',
    availability: 'out_of_stock',
    availability_label: 'Out of Stock',
    store_url: null,
    rating_avg: 4.2,
    rating_count: 15,
    value_score: 84,
    is_published: false,
    is_deleted: false,
    category: { id: 1, name: 'Laptops', slug: 'laptops' },
    brand: { id: 2, name: 'Dell', slug: 'dell' },
    primary_image: null,
    images: [],
    specs: [],
    price_history: [],
    created_at: '2026-11-16T10:00:00Z',
    updated_at: '2026-11-16T10:00:00Z',
    deleted_at: null,
  },
];

const mockProductImages: AdminProductImage[] = [
  {
    id: 1,
    url: '/storage/products/mbp16.webp',
    alt_text: 'Space Black MacBook Pro 16',
    sort_order: 0,
    is_primary: true,
  },
];

function renderPage() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <AdminProductsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminProductsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders product catalog table with products, prices, stock, and value scores', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/admin/products')) {
        return jsonResponse({
          data: mockProducts,
          meta: { current_page: 1, last_page: 1, total: 2, per_page: 25 },
        });
      }
      if (url.includes('/admin/categories')) {
        return jsonResponse({
          data: mockCategories,
          meta: { current_page: 1, last_page: 1, total: 1, per_page: 100 },
        });
      }
      if (url.includes('/admin/brands')) {
        return jsonResponse({
          data: mockBrands,
          meta: { current_page: 1, last_page: 1, total: 2, per_page: 100 },
        });
      }
      return jsonResponse({ data: [] });
    });

    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Product catalog' }),
    ).toBeInTheDocument();

    expect(await screen.findByText('MacBook Pro 16')).toBeInTheDocument();
    expect(screen.getByText('Dell XPS 15')).toBeInTheDocument();
    expect(screen.getByText('$2,499.00')).toBeInTheDocument();
    expect(screen.getByText('$1,899.00')).toBeInTheDocument();
    expect(screen.getByText('In Stock')).toBeInTheDocument();
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.getByText('VS 92')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('Published')).toBeInTheDocument();
    expect(within(table).getByText('Draft')).toBeInTheDocument();
  });

  it('filters products by keyword and updates query parameters', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes('/admin/products')) {
          return jsonResponse({
            data: mockProducts,
            meta: { current_page: 1, last_page: 1, total: 2, per_page: 25 },
          });
        }
        return jsonResponse({ data: [] });
      });

    renderPage();

    const searchInput = await screen.findByPlaceholderText(
      'Search products by name, slug, or brand...',
    );
    await user.type(searchInput, 'MacBook');

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([req]) =>
          String(req).includes('search=MacBook'),
        ),
      ).toBe(true);
    });
  });

  it('opens product creation dialog, validates required fields, and creates product', async () => {
    const user = userEvent.setup();
    let productCreated = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.includes('/admin/products') && method === 'POST') {
        productCreated = true;
        return jsonResponse(
          {
            data: {
              id: 103,
              name: 'Lenovo ThinkPad X1',
              slug: 'lenovo-thinkpad-x1',
              category_id: 1,
              brand_id: 2,
              price: {
                amount: '1599.00',
                currency: 'USD',
                formatted: '$1,599.00',
              },
              currency: 'USD',
              availability: 'in_stock',
              availability_label: 'In Stock',
              is_published: true,
              is_deleted: false,
            },
          },
          201,
        );
      }
      if (url.includes('/admin/categories/1/specs')) {
        return jsonResponse({ data: mockSpecs });
      }
      if (url.includes('/admin/products')) {
        return jsonResponse({
          data: mockProducts,
          meta: { current_page: 1, last_page: 1, total: 2, per_page: 25 },
        });
      }
      if (url.includes('/admin/categories')) {
        return jsonResponse({ data: mockCategories });
      }
      if (url.includes('/admin/brands')) {
        return jsonResponse({ data: mockBrands });
      }
      return jsonResponse({ data: [] });
    });

    renderPage();

    const addButton = await screen.findByRole('button', {
      name: 'Add product',
    });
    await user.click(addButton);

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('heading', {
        level: 2,
        name: 'Add new product',
      }),
    ).toBeInTheDocument();

    // Trigger validation
    const submitBtn = within(dialog).getByRole('button', {
      name: 'Create product',
    });
    await user.click(submitBtn);

    expect(
      await within(dialog).findByText('Name must be at least 2 characters.'),
    ).toBeInTheDocument();

    // Fill form
    await user.type(
      within(dialog).getByLabelText(/Product name/i),
      'Lenovo ThinkPad X1',
    );
    await user.selectOptions(within(dialog).getByLabelText(/Category/i), '1');
    await user.selectOptions(within(dialog).getByLabelText(/Brand/i), '2');
    await user.type(within(dialog).getByLabelText(/Price/i), '1599');
    await user.type(
      within(dialog).getByLabelText(/Summary/i),
      'Reliable enterprise laptop with carbon fiber chassis.',
    );
    await user.type(
      within(dialog).getByLabelText(/Full description/i),
      'Full specs and enterprise durability details.',
    );

    // Wait for category specs to load and fill RAM Size
    const ramInput = await within(dialog).findByLabelText(/RAM Size/i);
    await user.type(ramInput, '32');

    await user.click(submitBtn);

    await waitFor(() => {
      expect(productCreated).toBe(true);
    });
  });

  it('opens edit dialog prefilled with product and saves changes', async () => {
    const user = userEvent.setup();
    let productUpdated = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.includes('/admin/products/101') && method === 'PATCH') {
        productUpdated = true;
        return jsonResponse({
          data: {
            ...mockProducts[0],
            price: {
              amount: '2399.00',
              currency: 'USD',
              formatted: '$2,399.00',
            },
          },
        });
      }
      if (url.includes('/admin/categories/1/specs')) {
        return jsonResponse({ data: mockSpecs });
      }
      if (url.includes('/admin/products')) {
        return jsonResponse({
          data: mockProducts,
          meta: { current_page: 1, last_page: 1, total: 2, per_page: 25 },
        });
      }
      if (url.includes('/admin/categories')) {
        return jsonResponse({ data: mockCategories });
      }
      if (url.includes('/admin/brands')) {
        return jsonResponse({ data: mockBrands });
      }
      return jsonResponse({ data: [] });
    });

    renderPage();

    const editButtons = await screen.findAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[0]);

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Edit product' }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('MacBook Pro 16')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2499.00')).toBeInTheDocument();

    const priceInput = screen.getByDisplayValue('2499.00');
    await user.clear(priceInput);
    await user.type(priceInput, '2399.00');

    const saveBtn = screen.getByRole('button', { name: 'Save changes' });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(productUpdated).toBe(true);
    });
  });

  it('soft-deletes a product upon confirmation', async () => {
    const user = userEvent.setup();
    let productDeleted = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.includes('/admin/products/102') && method === 'DELETE') {
        productDeleted = true;
        return new Response(null, { status: 204 });
      }
      if (url.includes('/admin/products')) {
        return jsonResponse({
          data: mockProducts,
          meta: { current_page: 1, last_page: 1, total: 2, per_page: 25 },
        });
      }
      return jsonResponse({ data: [] });
    });

    renderPage();

    const deleteBtn = await screen.findByRole('button', {
      name: 'Delete Dell XPS 15',
    });
    await user.click(deleteBtn);

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(/Are you sure you want to delete/i),
    ).toBeInTheDocument();

    const confirmDeleteBtn = within(dialog).getByRole('button', {
      name: 'Delete product',
    });
    await user.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(productDeleted).toBe(true);
    });
  });

  it('supports selecting products and bulk publishing them', async () => {
    const user = userEvent.setup();
    let bulkUpdated = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.includes('/admin/products/bulk-status') && method === 'PATCH') {
        bulkUpdated = true;
        return jsonResponse({ data: { message: 'Updated' } });
      }
      if (url.includes('/admin/products')) {
        return jsonResponse({
          data: mockProducts,
          meta: { current_page: 1, last_page: 1, total: 2, per_page: 25 },
        });
      }
      return jsonResponse({ data: [] });
    });

    renderPage();

    const selectDellCheckbox = await screen.findByRole('checkbox', {
      name: 'Select Dell XPS 15',
    });
    await user.click(selectDellCheckbox);

    expect(await screen.findByText('1 product selected')).toBeInTheDocument();

    const publishSelectedBtn = screen.getByRole('button', {
      name: 'Publish selected',
    });
    await user.click(publishSelectedBtn);

    await waitFor(() => {
      expect(bulkUpdated).toBe(true);
    });
  });

  it('opens product images manager dialog and shows gallery', async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/admin/products/101/images')) {
        return jsonResponse({ data: mockProductImages });
      }
      if (url.includes('/admin/products')) {
        return jsonResponse({
          data: mockProducts,
          meta: { current_page: 1, last_page: 1, total: 2, per_page: 25 },
        });
      }
      return jsonResponse({ data: [] });
    });

    renderPage();

    const imageButtons = await screen.findAllByRole('button', {
      name: 'Images',
    });
    await user.click(imageButtons[0]);

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Manage product images',
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Space Black MacBook Pro 16'),
    ).toBeInTheDocument();
    expect(screen.getByText('Primary')).toBeInTheDocument();
  });
});
