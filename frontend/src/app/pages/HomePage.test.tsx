import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompareProvider } from '@/features/compare/components/CompareProvider';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { STARTER_PROMPT_SUGGESTIONS } from '@/features/assistant/lib/assistant-prompts';
import { HomePage } from './HomePage';

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

function renderHomePage(initialEntries = ['/']) {
  const queryClient = createTestQueryClient();
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CompareProvider>
            <MemoryRouter initialEntries={initialEntries}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route
                  path="/assistant"
                  element={
                    <div data-testid="assistant-destination">
                      Assistant Page
                    </div>
                  }
                />
                <Route
                  path="/products"
                  element={
                    <div data-testid="products-destination">Products Page</div>
                  }
                />
                <Route
                  path="/compare"
                  element={
                    <div data-testid="compare-destination">Compare Page</div>
                  }
                />
              </Routes>
            </MemoryRouter>
          </CompareProvider>
        </AuthProvider>
      </QueryClientProvider>,
    ),
  };
}

describe('HomePage hero connected to assistant', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes('/sanctum/csrf-cookie')) {
        return new Response(null, { status: 204 });
      }

      if (url.includes('/api/v1/auth/me')) {
        return jsonResponse(
          { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
          401,
        );
      }

      if (url.includes('/api/v1/products')) {
        return jsonResponse({
          data: [],
          meta: { current_page: 1, per_page: 6, total: 0, last_page: 1 },
          links: {},
        });
      }

      if (url.includes('/api/v1/wishlist')) {
        return jsonResponse({ data: [] });
      }

      return jsonResponse({ data: null }, 404);
    });
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders the hero title, input, Ask Assistant button, and all starter prompts', () => {
    renderHomePage();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Decide what to buy, with the homework done.',
      }),
    ).toBeInTheDocument();

    const input = screen.getByLabelText('Search with shopping assistant');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute(
      'placeholder',
      "What are you shopping for, and what's your budget?",
    );

    expect(
      screen.getByRole('button', { name: /Ask Assistant/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Catalog/i }),
    ).toBeInTheDocument();

    // Verify all starter prompts are present
    for (const prompt of STARTER_PROMPT_SUGGESTIONS) {
      expect(
        screen.getByRole('button', { name: prompt.text }),
      ).toBeInTheDocument();
    }
  });

  it('navigates to /assistant?q=... when submitting a query in the hero input', async () => {
    const user = userEvent.setup();
    renderHomePage();

    const input = screen.getByLabelText('Search with shopping assistant');
    await user.type(input, 'Gaming laptop under 75000');

    const submitBtn = screen.getByRole('button', { name: /Ask Assistant/i });
    await user.click(submitBtn);

    expect(
      await screen.findByTestId('assistant-destination'),
    ).toBeInTheDocument();
  });

  it('navigates to /assistant when submitting an empty input', async () => {
    const user = userEvent.setup();
    renderHomePage();

    const submitBtn = screen.getByRole('button', { name: /Ask Assistant/i });
    await user.click(submitBtn);

    expect(
      await screen.findByTestId('assistant-destination'),
    ).toBeInTheDocument();
  });

  it('navigates to assistant with query, category, and budget when tapping a starter prompt', async () => {
    const user = userEvent.setup();
    renderHomePage();

    const starterBtn = screen.getByRole('button', {
      name: 'Laptop for video editing under ₹90,000',
    });
    await user.click(starterBtn);

    expect(
      await screen.findByTestId('assistant-destination'),
    ).toBeInTheDocument();
  });

  it('navigates to /products?q=... when clicking the secondary Catalog button', async () => {
    const user = userEvent.setup();
    renderHomePage();

    const input = screen.getByLabelText('Search with shopping assistant');
    await user.type(input, 'MacBook');

    const catalogBtn = screen.getByRole('button', { name: /Catalog/i });
    await user.click(catalogBtn);

    expect(
      await screen.findByTestId('products-destination'),
    ).toBeInTheDocument();
  });

  it('links to catalog, compare, and assistant from the secondary action buttons', () => {
    renderHomePage();

    const browseLink = screen.getByRole('link', {
      name: /Browse 60\+ products/i,
    });
    expect(browseLink).toHaveAttribute('href', '/products');

    const compareLink = screen.getByRole('link', {
      name: /Compare finalists/i,
    });
    expect(compareLink).toHaveAttribute('href', '/compare');

    const assistantLink = screen.getByRole('link', {
      name: /Ask shopping assistant/i,
    });
    expect(assistantLink).toHaveAttribute('href', '/assistant');
  });
});
