import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminCategoriesPage } from './AdminCategoriesPage';
import type { AdminCategory, AdminSpecDefinition } from '../types';

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
    name: 'Computing',
    slug: 'computing',
    description: 'Laptops, desktops, and accessories.',
    image_path: null,
    image_url: null,
    sort_order: 1,
    is_active: true,
    products_count: 12,
    spec_definitions_count: 4,
    children_count: 2,
    created_at: '2026-11-16T10:00:00Z',
    updated_at: '2026-11-16T10:00:00Z',
  },
  {
    id: 2,
    parent_id: 1,
    parent: { id: 1, name: 'Computing', slug: 'computing' },
    name: 'Laptops',
    slug: 'laptops',
    description: 'Ultrabooks, workstations, and gaming laptops.',
    image_path: null,
    image_url: null,
    sort_order: 2,
    is_active: true,
    products_count: 8,
    spec_definitions_count: 5,
    children_count: 0,
    created_at: '2026-11-16T10:00:00Z',
    updated_at: '2026-11-16T10:00:00Z',
  },
  {
    id: 3,
    parent_id: null,
    parent: null,
    name: 'Wearables',
    slug: 'wearables',
    description: null,
    image_path: null,
    image_url: null,
    sort_order: 3,
    is_active: false,
    products_count: 0,
    spec_definitions_count: 0,
    children_count: 0,
    created_at: '2026-11-16T10:00:00Z',
    updated_at: '2026-11-16T10:00:00Z',
  },
];

const mockSpecs: AdminSpecDefinition[] = [
  {
    id: 10,
    category_id: 2,
    key: 'ram_gb',
    label: 'RAM Size',
    unit: 'GB',
    data_type: 'number',
    is_filterable: true,
    is_comparable: true,
    higher_is_better: true,
    sort_order: 1,
    product_specs_count: 8,
    created_at: '2026-11-16T10:00:00Z',
    updated_at: '2026-11-16T10:00:00Z',
  },
];

function renderPage() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <AdminCategoriesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminCategoriesPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders category table with hierarchy, products, specs, and status badges', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/admin/categories')) {
        return jsonResponse({ data: mockCategories });
      }
      return jsonResponse({ data: [] });
    });

    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Categories & Specs' }),
    ).toBeInTheDocument();

    expect(await screen.findByText('Computing')).toBeInTheDocument();
    expect(screen.getByText('/computing')).toBeInTheDocument();
    expect(screen.getByText('Laptops')).toBeInTheDocument();
    expect(screen.getByText('/laptops')).toBeInTheDocument();
    expect(screen.getByText('Child of Computing')).toBeInTheDocument();

    // Badges
    expect(screen.getAllByText('Active')).toHaveLength(2);
    expect(screen.getByText('Inactive')).toBeInTheDocument();

    // Product counts
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();

    // Specs buttons
    expect(
      screen.getByRole('button', { name: /Specs \(4\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Specs \(5\)/i }),
    ).toBeInTheDocument();
  });

  it('filters categories by search input', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes('search=Lap')) {
          return jsonResponse({ data: [mockCategories[1]] });
        }
        return jsonResponse({ data: mockCategories });
      });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Computing')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(
      /Search categories by name or slug/i,
    );
    await user.type(searchInput, 'Lap');

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('search=Lap'),
        expect.anything(),
      );
    });
  });

  it('opens category creation dialog and submits new category', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.includes('/admin/categories') && method === 'POST') {
        return jsonResponse(
          {
            data: {
              id: 4,
              parent_id: null,
              parent: null,
              name: 'Monitors',
              slug: 'monitors',
              description: '4K and OLED monitors',
              sort_order: 4,
              is_active: true,
              products_count: 0,
              spec_definitions_count: 0,
              children_count: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
          201,
        );
      }

      return jsonResponse({ data: mockCategories });
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Computing')).toBeInTheDocument();

    const addBtn = screen.getByRole('button', { name: /Add Category/i });
    await user.click(addBtn);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Create Category' }),
    ).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Name/i);
    await user.type(nameInput, 'Monitors');

    const submitBtn = screen.getByRole('button', { name: 'Create Category' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { level: 2, name: 'Create Category' }),
      ).not.toBeInTheDocument();
    });
  });

  it('opens specs drawer, lists specs, and can add a new spec definition', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.includes('/admin/categories/2/specs') && method === 'GET') {
        return jsonResponse({ data: mockSpecs });
      }

      if (url.includes('/admin/categories/2/specs') && method === 'POST') {
        return jsonResponse(
          {
            data: {
              id: 11,
              category_id: 2,
              key: 'storage_gb',
              label: 'Storage Capacity',
              unit: 'GB',
              data_type: 'number',
              is_filterable: true,
              is_comparable: true,
              higher_is_better: true,
              sort_order: 2,
              product_specs_count: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
          201,
        );
      }

      return jsonResponse({ data: mockCategories });
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Laptops')).toBeInTheDocument();

    const specsBtn = screen.getByRole('button', { name: /Specs \(5\)/i });
    await user.click(specsBtn);

    expect(await screen.findByText('Laptops Specs')).toBeInTheDocument();
    expect(await screen.findByText('RAM Size')).toBeInTheDocument();
    expect(screen.getByText('ram_gb')).toBeInTheDocument();
    expect(screen.getByText('Filterable')).toBeInTheDocument();

    // Click Add Spec
    const addSpecBtn = screen.getByRole('button', { name: 'Add Spec' });
    await user.click(addSpecBtn);

    expect(screen.getByText('New Spec Definition')).toBeInTheDocument();

    const labelInput = screen.getByLabelText(/Label/i);
    await user.type(labelInput, 'Storage Capacity');

    const keyInput = screen.getByLabelText(/Key \(snake_case\)/i);
    await user.type(keyInput, 'storage_gb');

    const saveSpecBtn = screen.getByRole('button', { name: 'Add Spec' });
    await user.click(saveSpecBtn);

    await waitFor(() => {
      expect(screen.queryByText('New Spec Definition')).not.toBeInTheDocument();
    });
  });

  it('shows category deletion confirmation and warns when category has products', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ data: mockCategories }),
    );

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Computing')).toBeInTheDocument();

    // Computing has 12 products
    const deleteBtn = screen.getByRole('button', { name: 'Delete Computing' });
    await user.click(deleteBtn);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Delete Category' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Category contains products/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /This category currently contains 12 products. Categories with products cannot be deleted./i,
      ),
    ).toBeInTheDocument();

    // Delete button should be disabled
    const confirmDeleteBtn = screen.getByRole('button', {
      name: 'Delete Category',
    });
    expect(confirmDeleteBtn).toBeDisabled();
  });
});
