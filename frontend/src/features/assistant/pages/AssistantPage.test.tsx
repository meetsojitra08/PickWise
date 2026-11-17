import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { CompareProvider } from '@/features/compare/components/CompareProvider';
import type { ProductSummary } from '@/features/catalog/types/catalog';
import { AssistantPage } from './AssistantPage';

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

const mockProductA: ProductSummary = {
  id: 14,
  name: 'Aurora 14 Creator Laptop',
  slug: 'aurora-14-creator',
  summary: '32GB RAM, 1TB SSD, OLED display for video editing.',
  price: { amount: '85000.00', currency: 'INR' },
  availability: 'in_stock',
  availability_label: 'In Stock',
  rating_avg: 4.8,
  rating_count: 42,
  value_score: 91,
  category: { id: 2, name: 'Laptops', slug: 'laptops' },
  brand: { id: 5, name: 'Aurora', slug: 'aurora', logo_url: null },
  primary_image: {
    id: 101,
    url: '/storage/products/aurora-14.jpg',
    alt_text: 'Aurora 14 Creator',
  },
  created_at: '2026-11-10T14:15:00Z',
};

const mockProductB: ProductSummary = {
  id: 18,
  name: 'Zenith Studio Pro 15',
  slug: 'zenith-studio-pro-15',
  summary: 'Dedicated GPU, 32GB RAM, colour calibrated 4K panel.',
  price: { amount: '89990.00', currency: 'INR' },
  availability: 'in_stock',
  availability_label: 'In Stock',
  rating_avg: 4.6,
  rating_count: 27,
  value_score: 87,
  category: { id: 2, name: 'Laptops', slug: 'laptops' },
  brand: { id: 6, name: 'Zenith', slug: 'zenith', logo_url: null },
  primary_image: {
    id: 102,
    url: '/storage/products/zenith-15.jpg',
    alt_text: 'Zenith Studio Pro 15',
  },
  created_at: '2026-11-10T14:15:00Z',
};

const mockProductAlt: ProductSummary = {
  id: 25,
  name: 'Titan Creator 16 Max',
  slug: 'titan-creator-16-max',
  summary: '64GB RAM, RTX 4070, high performance workstation.',
  price: { amount: '99000.00', currency: 'INR' },
  availability: 'in_stock',
  availability_label: 'In Stock',
  rating_avg: 4.9,
  rating_count: 53,
  value_score: 84,
  category: { id: 2, name: 'Laptops', slug: 'laptops' },
  brand: { id: 7, name: 'Titan', slug: 'titan', logo_url: null },
  primary_image: null,
  created_at: '2026-11-10T14:15:00Z',
};

function renderAssistantPage(initialEntries = ['/assistant']) {
  const queryClient = createTestQueryClient();
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CompareProvider>
            <MemoryRouter initialEntries={initialEntries}>
              <Routes>
                <Route path="/assistant" element={<AssistantPage />} />
                <Route
                  path="/compare"
                  element={
                    <div data-testid="compare-page">Compare Matrix Page</div>
                  }
                />
                <Route
                  path="/products/:slug"
                  element={<div data-testid="product-page">Product Detail</div>}
                />
              </Routes>
            </MemoryRouter>
          </CompareProvider>
        </AuthProvider>
      </QueryClientProvider>,
    ),
  };
}

describe('AssistantPage', () => {
  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=test-token; path=/';
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.cookie =
      'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders title, QuotaMeter, empty state with 3 starter prompts, and handles starter click', async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.includes('/sanctum/csrf-cookie')) {
        return new Response(null, { status: 204 });
      }

      if (url.includes('/api/v1/auth/me')) {
        return jsonResponse(
          { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
          401,
        );
      }

      if (url.includes('/api/v1/assistant/quota')) {
        return jsonResponse({
          data: {
            limit: 5,
            used: 1,
            remaining: 4,
            resets_at: '2026-11-15T00:00:00Z',
          },
        });
      }

      if (url.includes('/api/v1/categories')) {
        return jsonResponse({
          data: [{ id: 2, name: 'Laptops', slug: 'laptops', children: [] }],
        });
      }

      if (url.includes('/messages') && method === 'POST') {
        return jsonResponse(
          {
            data: {
              id: 201,
              role: 'assistant',
              content:
                'Here are two great options for video editing under ₹90,000.',
              recommendations: [
                {
                  product_id: mockProductA.id,
                  product: mockProductA,
                  reason: '32GB RAM and colour accurate OLED panel.',
                  tradeoffs: ['Fans get loud during 4K render exports.'],
                },
                {
                  product_id: mockProductB.id,
                  product: mockProductB,
                  reason: 'Dedicated GPU acceleration.',
                  tradeoffs: ['Slightly heavier chassis at 2.1kg.'],
                },
              ],
              alternatives: [],
              status: 'ok',
              created_at: '2026-11-14T18:00:00Z',
            },
          },
          201,
        );
      }

      if (
        url.includes('/api/v1/assistant/conversations') &&
        method === 'POST'
      ) {
        return jsonResponse(
          {
            data: {
              id: 101,
              title: 'Laptop for video editing under ₹90,000',
              messages: [],
            },
          },
          201,
        );
      }

      if (url.includes('/conversations/101') && method === 'GET') {
        return jsonResponse({
          data: {
            id: 101,
            title: 'Laptop for video editing under ₹90,000',
            messages: [
              {
                id: 201,
                role: 'assistant',
                content:
                  'Here are two great options for video editing under ₹90,000.',
                recommendations: [
                  {
                    product_id: mockProductA.id,
                    product: mockProductA,
                    reason: '32GB RAM and colour accurate OLED panel.',
                    tradeoffs: ['Fans get loud during 4K render exports.'],
                  },
                  {
                    product_id: mockProductB.id,
                    product: mockProductB,
                    reason: 'Dedicated GPU acceleration.',
                    tradeoffs: ['Slightly heavier chassis at 2.1kg.'],
                  },
                ],
                alternatives: [],
                status: 'ok',
                created_at: '2026-11-14T18:00:00Z',
              },
            ],
          },
        });
      }

      if (url.includes('/api/v1/assistant/conversations') && method === 'GET') {
        return jsonResponse({
          data: [],
          meta: { current_page: 1, per_page: 20, total: 0, last_page: 1 },
          links: {},
        });
      }

      return jsonResponse({ data: null }, 404);
    });

    renderAssistantPage();

    // Check header & QuotaMeter
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Shopping Assistant',
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText('4')).toBeInTheDocument();
    expect(screen.getByText('AI answers left today')).toBeInTheDocument();

    // Check starter prompt pills
    const starterButton = screen.getByRole('button', {
      name: /Laptop for video editing under ₹90,000/i,
    });
    expect(starterButton).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /Noise-cancelling wireless headphones for travel/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /Best 4K monitor for programming under ₹40,000/i,
      }),
    ).toBeInTheDocument();

    // Click the starter prompt
    await user.click(starterButton);

    // Verify recommendations show up
    expect(
      await screen.findByText(
        'Here are two great options for video editing under ₹90,000.',
      ),
    ).toBeInTheDocument();

    expect(screen.getByText('Aurora 14 Creator Laptop')).toBeInTheDocument();
    expect(screen.getAllByText('Why it fits').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText('32GB RAM and colour accurate OLED panel.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Fans get loud during 4K render exports.'),
    ).toBeInTheDocument();

    expect(screen.getByText('Zenith Studio Pro 15')).toBeInTheDocument();

    // Verify "Compare these (2)" action button exists
    const compareTheseBtn = screen.getByRole('button', {
      name: /Compare these \(2\)/i,
    });
    expect(compareTheseBtn).toBeInTheDocument();

    // Click "Compare these (2)" and verify navigation to /compare
    await user.click(compareTheseBtn);
    expect(await screen.findByTestId('compare-page')).toBeInTheDocument();
  });

  it('renders fallback state notice when AI provider fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.includes('/sanctum/csrf-cookie')) {
        return new Response(null, { status: 204 });
      }

      if (url.includes('/api/v1/auth/me')) {
        return jsonResponse(
          { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
          401,
        );
      }

      if (url.includes('/api/v1/assistant/quota')) {
        return jsonResponse({
          data: {
            limit: 5,
            used: 0,
            remaining: 5,
            resets_at: '2026-11-15T00:00:00Z',
          },
        });
      }

      if (url.includes('/api/v1/categories')) {
        return jsonResponse({ data: [] });
      }

      if (url.includes('/conversations/99')) {
        return jsonResponse({
          data: {
            id: 99,
            title: 'Fallback query',
            messages: [
              {
                id: 1,
                role: 'user',
                content: 'Need any laptop under 90000',
                recommendations: [],
                alternatives: [],
                status: 'ok',
                created_at: '2026-11-14T12:00:00Z',
              },
              {
                id: 2,
                role: 'assistant',
                content:
                  'AI is unavailable right now. Here are the best matches from the catalog.',
                recommendations: [
                  {
                    product_id: mockProductA.id,
                    product: mockProductA,
                    reason: null,
                    tradeoffs: [],
                  },
                ],
                alternatives: [],
                status: 'fallback',
                created_at: '2026-11-14T12:00:01Z',
              },
            ],
          },
        });
      }

      if (url.includes('/api/v1/assistant/conversations') && method === 'GET') {
        return jsonResponse({
          data: [
            {
              id: 99,
              title: 'Fallback query',
              last_message_at: '2026-11-14T12:00:00Z',
              messages_count: 2,
            },
          ],
          meta: { current_page: 1, per_page: 20, total: 1, last_page: 1 },
          links: {},
        });
      }

      return jsonResponse({ data: null }, 404);
    });

    const user = userEvent.setup();
    renderAssistantPage();

    // Select conversation 99 from the sidebar
    const convBtn = await screen.findByRole('button', {
      name: 'Fallback query',
    });
    await user.click(convBtn);

    // Verify fallback status banner
    expect(
      await screen.findByText('AI is temporarily unavailable'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Showing matching products directly from our catalog/),
    ).toBeInTheDocument();
    expect(screen.getByText('Catalog match')).toBeInTheDocument();
    expect(screen.getByText('Aurora 14 Creator Laptop')).toBeInTheDocument();
  });

  it('renders over-budget alternatives when no products fit budget', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.includes('/sanctum/csrf-cookie')) {
        return new Response(null, { status: 204 });
      }

      if (url.includes('/api/v1/auth/me')) {
        return jsonResponse(
          { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
          401,
        );
      }

      if (url.includes('/api/v1/assistant/quota')) {
        return jsonResponse({
          data: {
            limit: 5,
            used: 0,
            remaining: 5,
            resets_at: '2026-11-15T00:00:00Z',
          },
        });
      }

      if (url.includes('/api/v1/categories')) {
        return jsonResponse({ data: [] });
      }

      if (url.includes('/conversations/77')) {
        return jsonResponse({
          data: {
            id: 77,
            title: 'Strict budget search',
            messages: [
              {
                id: 1,
                role: 'user',
                content: 'Workstation laptop under 80000',
                recommendations: [],
                alternatives: [],
                status: 'ok',
                created_at: '2026-11-14T12:00:00Z',
              },
              {
                id: 2,
                role: 'assistant',
                content:
                  'We could not find any laptop under ₹80,000 meeting all requirements. Here are close alternatives slightly above your budget.',
                recommendations: [],
                alternatives: [
                  {
                    product_id: mockProductAlt.id,
                    product: mockProductAlt,
                    reason: '64GB RAM workstation exceeds requirements.',
                    tradeoffs: [
                      'Costs ₹99,000, which is 10% over your budget.',
                    ],
                  },
                ],
                status: 'ok',
                created_at: '2026-11-14T12:00:01Z',
              },
            ],
          },
        });
      }

      if (url.includes('/api/v1/assistant/conversations') && method === 'GET') {
        return jsonResponse({
          data: [
            {
              id: 77,
              title: 'Strict budget search',
              last_message_at: '2026-11-14T12:00:00Z',
              messages_count: 2,
            },
          ],
          meta: { current_page: 1, per_page: 20, total: 1, last_page: 1 },
          links: {},
        });
      }

      return jsonResponse({ data: null }, 404);
    });

    const user = userEvent.setup();
    renderAssistantPage();

    const convBtn = await screen.findByRole('button', {
      name: 'Strict budget search',
    });
    await user.click(convBtn);

    expect(await screen.findByText('Close alternatives')).toBeInTheDocument();
    expect(screen.getByText('Up to 15% over budget')).toBeInTheDocument();
    expect(screen.getByText('Titan Creator 16 Max')).toBeInTheDocument();
    expect(screen.getByText('Alternative (over budget)')).toBeInTheDocument();
    expect(
      screen.getByText('Costs ₹99,000, which is 10% over your budget.'),
    ).toBeInTheDocument();
  });

  it('renders quota exhausted state when remaining is 0', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes('/api/v1/auth/me')) {
        return jsonResponse(
          { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
          401,
        );
      }

      if (url.includes('/api/v1/assistant/quota')) {
        return jsonResponse({
          data: {
            limit: 30,
            used: 30,
            remaining: 0,
            resets_at: '2026-11-15T00:00:00Z',
          },
        });
      }

      if (url.includes('/api/v1/categories')) {
        return jsonResponse({ data: [] });
      }

      if (url.includes('/api/v1/assistant/conversations')) {
        return jsonResponse({
          data: [],
          meta: { current_page: 1, per_page: 20, total: 0, last_page: 1 },
          links: {},
        });
      }

      return jsonResponse({ data: null }, 404);
    });

    renderAssistantPage();

    // Check quota meter shows 0
    expect(await screen.findByText('0')).toBeInTheDocument();
    expect(screen.getByText('AI answers left today')).toBeInTheDocument();

    // Check form shows exhausted alert and disabled inputs
    expect(
      screen.getByText(
        "You've used today's AI answers. Browse and filter products in the meantime.",
      ),
    ).toBeInTheDocument();

    const messageInput = screen.getByLabelText('Message to assistant');
    expect(messageInput).toBeDisabled();
  });

  it('shows error state with retry button when API fails', async () => {
    let attempts = 0;
    const user = userEvent.setup();

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.includes('/sanctum/csrf-cookie')) {
        return new Response(null, { status: 204 });
      }

      if (url.includes('/api/v1/auth/me')) {
        return jsonResponse(
          { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
          401,
        );
      }

      if (url.includes('/api/v1/assistant/quota')) {
        return jsonResponse({
          data: {
            limit: 5,
            used: 0,
            remaining: 5,
            resets_at: '2026-11-15T00:00:00Z',
          },
        });
      }

      if (url.includes('/api/v1/categories')) {
        return jsonResponse({ data: [] });
      }

      if (url.includes('/messages') && method === 'POST') {
        attempts++;
        if (attempts === 1) {
          return jsonResponse(
            {
              error: {
                code: 'service_unavailable',
                message: 'AI service temporarily unavailable',
              },
            },
            503,
          );
        }

        return jsonResponse(
          {
            data: {
              id: 301,
              role: 'assistant',
              content: 'Success after retry!',
              recommendations: [],
              alternatives: [],
              status: 'ok',
              created_at: '2026-11-14T18:00:00Z',
            },
          },
          201,
        );
      }

      if (url.includes('/conversations/42') && method === 'GET') {
        return jsonResponse({
          data: {
            id: 42,
            title: 'Active chat',
            messages: [],
          },
        });
      }

      if (url.includes('/api/v1/assistant/conversations') && method === 'GET') {
        return jsonResponse({
          data: [
            {
              id: 42,
              title: 'Active chat',
              last_message_at: '2026-11-14T12:00:00Z',
              messages_count: 0,
            },
          ],
          meta: { current_page: 1, per_page: 20, total: 1, last_page: 1 },
          links: {},
        });
      }

      return jsonResponse({ data: null }, 404);
    });

    renderAssistantPage();

    // Select the conversation
    const convBtn = await screen.findByRole('button', { name: 'Active chat' });
    await user.click(convBtn);

    // Type message and submit
    const input = screen.getByLabelText('Message to assistant');
    await user.type(input, 'Find me something good');
    const sendBtn = screen.getByRole('button', { name: 'Send message' });
    await user.click(sendBtn);

    // Verify error and retry button appear
    expect(
      await screen.findByText('AI service temporarily unavailable'),
    ).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: 'Retry' });
    expect(retryBtn).toBeInTheDocument();

    // Click retry
    await user.click(retryBtn);

    // Verify successful response
    expect(await screen.findByText('Success after retry!')).toBeInTheDocument();
  });

  it('automatically creates conversation and sends message when mounted with query parameters', async () => {
    let capturedPayload: unknown = null;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.includes('/sanctum/csrf-cookie')) {
        return new Response(null, { status: 204 });
      }

      if (url.includes('/api/v1/auth/me')) {
        return jsonResponse(
          { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
          401,
        );
      }

      if (url.includes('/api/v1/assistant/quota')) {
        return jsonResponse({
          data: {
            limit: 5,
            used: 1,
            remaining: 4,
            resets_at: '2026-11-15T00:00:00Z',
          },
        });
      }

      if (url.includes('/api/v1/categories')) {
        return jsonResponse({
          data: [{ id: 2, name: 'Laptops', slug: 'laptops', children: [] }],
        });
      }

      if (url.includes('/messages') && method === 'POST') {
        capturedPayload = JSON.parse(String(init?.body));
        return jsonResponse(
          {
            data: {
              id: 601,
              role: 'assistant',
              content: 'Auto-executed recommendation from Home hero!',
              recommendations: [
                {
                  product_id: mockProductA.id,
                  product: mockProductA,
                  reason: '32GB RAM and colour accurate OLED panel.',
                  tradeoffs: ['Fans get loud during 4K render exports.'],
                },
              ],
              alternatives: [],
              status: 'ok',
              created_at: '2026-11-14T18:00:00Z',
            },
          },
          201,
        );
      }

      if (
        url.includes('/api/v1/assistant/conversations') &&
        method === 'POST'
      ) {
        return jsonResponse(
          {
            data: {
              id: 501,
              title: 'Laptop for video editing under ₹90,000',
              messages: [],
            },
          },
          201,
        );
      }

      if (url.includes('/conversations/501') && method === 'GET') {
        return jsonResponse({
          data: {
            id: 501,
            title: 'Laptop for video editing under ₹90,000',
            messages: [
              {
                id: 601,
                role: 'assistant',
                content: 'Auto-executed recommendation from Home hero!',
                recommendations: [
                  {
                    product_id: mockProductA.id,
                    product: mockProductA,
                    reason: '32GB RAM and colour accurate OLED panel.',
                    tradeoffs: ['Fans get loud during 4K render exports.'],
                  },
                ],
                alternatives: [],
                status: 'ok',
                created_at: '2026-11-14T18:00:00Z',
              },
            ],
          },
        });
      }

      if (url.includes('/api/v1/assistant/conversations') && method === 'GET') {
        return jsonResponse({
          data: [],
          meta: { current_page: 1, per_page: 20, total: 0, last_page: 1 },
          links: {},
        });
      }

      return jsonResponse({ data: null }, 404);
    });

    renderAssistantPage([
      '/assistant?q=Laptop+for+video+editing+under+%E2%82%B990%2C000&category=laptops&budget_max=90000',
    ]);

    // Should automatically render the AI response without manual user input
    expect(
      await screen.findByText('Auto-executed recommendation from Home hero!'),
    ).toBeInTheDocument();
    expect(screen.getByText('Aurora 14 Creator Laptop')).toBeInTheDocument();

    expect(capturedPayload).toEqual({
      message: 'Laptop for video editing under ₹90,000',
      category: 'laptops',
      budget_max: 90000,
    });
  });

  it('prefills form with query without auto-sending when quota is exhausted', async () => {
    let messagePostAttempted = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.includes('/sanctum/csrf-cookie')) {
        return new Response(null, { status: 204 });
      }

      if (url.includes('/messages') && method === 'POST') {
        messagePostAttempted = true;
      }
      if (
        url.includes('/api/v1/assistant/conversations') &&
        method === 'POST'
      ) {
        messagePostAttempted = true;
      }

      if (url.includes('/api/v1/auth/me')) {
        return jsonResponse(
          { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
          401,
        );
      }

      if (url.includes('/api/v1/assistant/quota')) {
        return jsonResponse({
          data: {
            limit: 30,
            used: 30,
            remaining: 0,
            resets_at: '2026-11-15T00:00:00Z',
          },
        });
      }

      if (url.includes('/api/v1/categories')) {
        return jsonResponse({ data: [] });
      }

      if (url.includes('/api/v1/assistant/conversations')) {
        return jsonResponse({
          data: [],
          meta: { current_page: 1, per_page: 20, total: 0, last_page: 1 },
          links: {},
        });
      }

      return jsonResponse({ data: null }, 404);
    });

    renderAssistantPage(['/assistant?q=Laptop+for+gaming']);

    // Check quota alert is shown
    expect(
      await screen.findByText(
        "You've used today's AI answers. Browse and filter products in the meantime.",
      ),
    ).toBeInTheDocument();

    // Check textarea is prefilled with the query from URL
    const messageInput = screen.getByLabelText('Message to assistant');
    expect(messageInput).toHaveValue('Laptop for gaming');
    expect(messagePostAttempted).toBe(false);
  });

  it('visibly pre-fills saved user preferences (budget and category) and allows clearing them', async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes('/api/v1/auth/me')) {
        return jsonResponse({
          data: {
            id: 1,
            name: 'Sarah Customer',
            email: 'sarah@example.com',
            role: 'customer',
            is_active: true,
            email_verified_at: '2026-11-10T00:00:00Z',
            created_at: '2026-11-10T00:00:00Z',
            preferences: {
              budget_default: 75000,
              favourite_categories: ['laptops', 'monitors'],
              priorities: ['battery life', 'weight'],
            },
          },
        });
      }

      if (url.includes('/api/v1/assistant/quota')) {
        return jsonResponse({
          data: {
            limit: 30,
            used: 5,
            remaining: 25,
            resets_at: '2026-11-15T00:00:00Z',
          },
        });
      }

      if (url.includes('/api/v1/categories')) {
        return jsonResponse({
          data: [
            { id: 2, name: 'Laptops', slug: 'laptops', children: [] },
            { id: 3, name: 'Monitors', slug: 'monitors', children: [] },
          ],
        });
      }

      if (url.includes('/api/v1/assistant/conversations')) {
        return jsonResponse({
          data: [],
          meta: { current_page: 1, per_page: 20, total: 0, last_page: 1 },
          links: {},
        });
      }

      return jsonResponse({ data: null }, 404);
    });

    renderAssistantPage();

    // Verify category select is pre-filled with the favourite category
    const categorySelect = screen.getByLabelText('Filter by category');
    const budgetInput = screen.getByLabelText('Maximum budget in rupees');

    await waitFor(() => {
      expect(categorySelect).toHaveValue('laptops');
      expect(budgetInput).toHaveValue(75000);
      expect(screen.getByTestId('saved-preferences-badge')).toHaveTextContent(
        'Saved preferences applied',
      );
    });

    // Verify "Clear filters" button is visible
    const clearButton = screen.getByRole('button', { name: 'Clear filters' });
    expect(clearButton).toBeInTheDocument();

    // Click "Clear filters"
    await user.click(clearButton);

    // Verify inputs are cleared
    expect(categorySelect).toHaveValue('');
    expect(budgetInput).toHaveValue(null);
    expect(
      screen.queryByTestId('saved-preferences-badge'),
    ).not.toBeInTheDocument();
  });

  it('gracefully ignores removed category in user preferences while keeping budget', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes('/api/v1/auth/me')) {
        return jsonResponse({
          data: {
            id: 1,
            name: 'Sarah Customer',
            email: 'sarah@example.com',
            role: 'customer',
            is_active: true,
            email_verified_at: '2026-11-10T00:00:00Z',
            created_at: '2026-11-10T00:00:00Z',
            preferences: {
              budget_default: 60000,
              favourite_categories: ['defunct-category-slug'],
              priorities: ['durability'],
            },
          },
        });
      }

      if (url.includes('/api/v1/assistant/quota')) {
        return jsonResponse({
          data: {
            limit: 30,
            used: 0,
            remaining: 30,
            resets_at: '2026-11-15T00:00:00Z',
          },
        });
      }

      if (url.includes('/api/v1/categories')) {
        return jsonResponse({
          data: [{ id: 2, name: 'Laptops', slug: 'laptops', children: [] }],
        });
      }

      if (url.includes('/api/v1/assistant/conversations')) {
        return jsonResponse({
          data: [],
          meta: { current_page: 1, per_page: 20, total: 0, last_page: 1 },
          links: {},
        });
      }

      return jsonResponse({ data: null }, 404);
    });

    renderAssistantPage();

    const categorySelect = screen.getByLabelText('Filter by category');
    const budgetInput = screen.getByLabelText('Maximum budget in rupees');

    // Defunct category slug is not in active categories, so category select resets to '' while budget is preserved
    await waitFor(() => {
      expect(budgetInput).toHaveValue(60000);
      expect(categorySelect).toHaveValue('');
    });
  });

  it('explicit URL parameters take precedence over saved user preferences', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes('/api/v1/auth/me')) {
        return jsonResponse({
          data: {
            id: 1,
            name: 'Sarah Customer',
            email: 'sarah@example.com',
            role: 'customer',
            is_active: true,
            preferences: {
              budget_default: 80000,
              favourite_categories: ['laptops'],
            },
          },
        });
      }

      if (url.includes('/api/v1/assistant/quota')) {
        return jsonResponse({
          data: {
            limit: 30,
            used: 0,
            remaining: 30,
            resets_at: '2026-11-15T00:00:00Z',
          },
        });
      }

      if (url.includes('/api/v1/categories')) {
        return jsonResponse({
          data: [
            { id: 2, name: 'Laptops', slug: 'laptops', children: [] },
            { id: 3, name: 'Monitors', slug: 'monitors', children: [] },
          ],
        });
      }

      if (url.includes('/api/v1/assistant/conversations')) {
        return jsonResponse({
          data: [],
          meta: { current_page: 1, per_page: 20, total: 0, last_page: 1 },
          links: {},
        });
      }

      return jsonResponse({ data: null }, 404);
    });

    // Mount with explicit URL params for monitors at 45000
    renderAssistantPage(['/assistant?category=monitors&budget_max=45000']);

    const categorySelect = screen.getByLabelText('Filter by category');
    const budgetInput = screen.getByLabelText('Maximum budget in rupees');

    await waitFor(() => {
      expect(categorySelect).toHaveValue('monitors');
      expect(budgetInput).toHaveValue(45000);
    });
  });

  it('reopens a past conversation when the URL contains conversation parameter', async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes('/api/v1/auth/me')) {
        return jsonResponse({
          data: {
            id: 1,
            name: 'Sarah Customer',
            email: 'sarah@example.com',
            role: 'customer',
            is_active: true,
            preferences: null,
          },
        });
      }

      if (url.includes('/api/v1/assistant/quota')) {
        return jsonResponse({
          data: {
            limit: 30,
            used: 0,
            remaining: 30,
            resets_at: '2026-11-15T00:00:00Z',
          },
        });
      }

      if (url.includes('/api/v1/categories')) {
        return jsonResponse({
          data: [{ id: 2, name: 'Laptops', slug: 'laptops', children: [] }],
        });
      }

      if (
        url === '/api/v1/assistant/conversations' ||
        url.startsWith('/api/v1/assistant/conversations?')
      ) {
        return jsonResponse({
          data: [
            {
              id: 42,
              title: 'Past Laptop Search',
              last_message_at: '2026-11-15T12:00:00Z',
              created_at: '2026-11-15T12:00:00Z',
              updated_at: '2026-11-15T12:00:00Z',
              messages_count: 2,
            },
          ],
          meta: { current_page: 1, per_page: 20, total: 1, last_page: 1 },
          links: {},
        });
      }

      if (url.includes('/api/v1/assistant/conversations/42')) {
        return jsonResponse({
          data: {
            id: 42,
            title: 'Past Laptop Search',
            last_message_at: '2026-11-15T12:00:00Z',
            created_at: '2026-11-15T12:00:00Z',
            updated_at: '2026-11-15T12:00:00Z',
            messages: [
              {
                id: 1,
                role: 'user',
                content: 'Find me a video editing laptop',
                recommendations: [],
                alternatives: [],
                status: 'ok',
                created_at: '2026-11-15T12:00:00Z',
              },
              {
                id: 2,
                role: 'assistant',
                content: 'Here is a powerful creator laptop for video editing.',
                recommendations: [
                  {
                    product_id: mockProductA.id,
                    product: mockProductA,
                    reason: 'Top color accuracy and CPU.',
                    tradeoffs: ['6-hour battery'],
                  },
                ],
                alternatives: [],
                status: 'ok',
                created_at: '2026-11-15T12:00:05Z',
              },
            ],
          },
        });
      }

      return jsonResponse({ data: null }, 404);
    });

    renderAssistantPage(['/assistant?conversation=42']);

    // Messages and recommended products from past conversation #42 should render
    expect(
      await screen.findByText('Find me a video editing laptop'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Here is a powerful creator laptop for video editing.'),
    ).toBeInTheDocument();
    expect(screen.getByText(mockProductA.name)).toBeInTheDocument();

    // Clicking New chat clears active conversation and resets to empty state suggestions
    const newChatBtn = screen.getByRole('button', { name: 'New chat' });
    await user.click(newChatBtn);

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Welcome, Sarah!',
      }),
    ).toBeInTheDocument();
  });

  it('displays error state with retry when active conversation fails to load', async () => {
    const user = userEvent.setup();
    let loadAttempts = 0;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes('/api/v1/auth/me')) {
        return jsonResponse(
          { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
          401,
        );
      }

      if (url.includes('/api/v1/assistant/quota')) {
        return jsonResponse({
          data: {
            limit: 30,
            used: 0,
            remaining: 30,
            resets_at: '2026-11-15T00:00:00Z',
          },
        });
      }

      if (url.includes('/api/v1/categories')) {
        return jsonResponse({ data: [] });
      }

      if (url.includes('/api/v1/assistant/conversations/99')) {
        loadAttempts++;
        if (loadAttempts === 1) {
          return jsonResponse(
            {
              error: { code: 'server_error', message: 'Database query failed' },
            },
            500,
          );
        }

        return jsonResponse({
          data: {
            id: 99,
            title: 'Recovered chat',
            messages: [
              {
                id: 501,
                role: 'user',
                content: 'Hello again',
                created_at: '2026-11-15T12:00:00Z',
              },
            ],
          },
        });
      }

      if (url.includes('/api/v1/assistant/conversations')) {
        return jsonResponse({
          data: [
            {
              id: 99,
              title: 'Problem chat',
              last_message_at: '2026-11-15T12:00:00Z',
              messages_count: 1,
            },
          ],
          meta: { current_page: 1, per_page: 20, total: 1, last_page: 1 },
          links: {},
        });
      }

      return jsonResponse({ data: null }, 404);
    });

    renderAssistantPage(['/assistant?conversation=99']);

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Could not load conversation',
      }),
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: 'Retry' });
    await user.click(retryBtn);

    expect(await screen.findByText('Hello again')).toBeInTheDocument();
  });

  it('displays error state in history sidebar when conversations list fails to load', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes('/api/v1/auth/me')) {
        return jsonResponse(
          { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
          401,
        );
      }

      if (url.includes('/api/v1/assistant/quota')) {
        return jsonResponse({
          data: {
            limit: 30,
            used: 0,
            remaining: 30,
            resets_at: '2026-11-15T00:00:00Z',
          },
        });
      }

      if (url.includes('/api/v1/categories')) {
        return jsonResponse({ data: [] });
      }

      if (url.includes('/api/v1/assistant/conversations')) {
        return jsonResponse(
          { error: { code: 'server_error', message: 'Internal error' } },
          500,
        );
      }

      return jsonResponse({ data: null }, 404);
    });

    renderAssistantPage();

    expect(
      await screen.findByText("Couldn't load history"),
    ).toBeInTheDocument();
  });
});
