import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { GlobalSearchDialog } from '@/features/catalog/components/GlobalSearchDialog';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function LocationText() {
  const location = useLocation();
  return <output>{`${location.pathname}${location.search}`}</output>;
}

function renderSearch() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <GlobalSearchDialog />
        <Routes>
          <Route path="*" element={<LocationText />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('GlobalSearchDialog', () => {
  it('opens with Ctrl+K, shows matching suggestions, and opens the selected product', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        data: [
          {
            id: 7,
            name: 'Everyday Laptop',
            slug: 'everyday-laptop',
            summary: 'A light laptop for daily work.',
            price: { amount: '64999.00', currency: 'INR' },
            availability: 'in_stock',
            availability_label: 'In stock',
            rating_avg: 4.5,
            rating_count: 20,
            value_score: 81,
            brand: {
              id: 1,
              name: 'Northstar',
              slug: 'northstar',
              logo_url: null,
            },
            category: { id: 2, name: 'Laptops', slug: 'laptops' },
            primary_image: null,
            created_at: null,
          },
        ],
        meta: { current_page: 1, per_page: 6, total: 1, last_page: 1 },
        links: { next: null },
      }),
    );

    renderSearch();
    await user.keyboard('{Control>}k{/Control}');
    const input = await screen.findByRole('searchbox', {
      name: 'Search products',
    });
    await user.type(input, 'laptop');

    const suggestion = await screen.findByRole('button', {
      name: /Everyday Laptop/,
    });
    expect(suggestion).toHaveTextContent('Northstar · Laptops');

    await user.keyboard('{ArrowDown}');
    expect(suggestion).toHaveFocus();
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(screen.getByText('/products/everyday-laptop')).toBeInTheDocument();
    });
  });

  it('submits the typed query to the catalog results URL', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        data: [],
        meta: { current_page: 1, per_page: 6, total: 0, last_page: 1 },
        links: { next: null },
      }),
    );
    renderSearch();

    await user.click(screen.getByRole('button', { name: 'Search products' }));
    const input = await screen.findByRole('searchbox', {
      name: 'Search products',
    });
    await user.type(input, 'gaming mouse');
    await user.click(screen.getByRole('button', { name: 'View all results' }));

    expect(screen.getByText('/products?q=gaming%20mouse')).toBeInTheDocument();
  });
});
