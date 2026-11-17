import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminDashboardPage } from './AdminDashboardPage';
import type { AdminDashboardData } from '../types';

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

const mockDashboardData: AdminDashboardData = {
  counts: {
    products: { total: 42, published: 40, unpublished: 2 },
    users: { total: 15, active: 14, customers: 12, admins: 3 },
    pending_reviews: 4,
    ai_calls_today: 18,
  },
  ai_usage_today: {
    total_calls: 18,
    successful_calls: 17,
    failed_calls: 1,
    total_tokens: 14500,
    avg_latency_ms: 320,
  },
  recent_activity: [
    {
      id: 1,
      admin: { id: 1, name: 'Lead Admin', email: 'admin@pickwise.test' },
      action: 'product.created',
      subject_type: 'App\\Models\\Product',
      subject_id: 10,
      changes: { after: { name: 'MacBook Air M3' } },
      ip_address: '127.0.0.1',
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
  ],
  pending_reviews: [
    {
      id: 101,
      product: { id: 10, name: 'MacBook Air M3', slug: 'macbook-air-m3' },
      author_name: 'Shopper Rohan',
      rating: 5,
      title: 'Remarkable battery life',
      body: 'Quiet, light, and battery lasts all day.',
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
  ],
};

function renderDashboard() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading skeleton while fetching data', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}));

    renderDashboard();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Admin overview' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('admin-dashboard-skeleton')).toBeInTheDocument();
  });

  it('renders KPI tiles, AI summary, recent activity, and pending reviews when data loads', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ data: mockDashboardData }),
    );

    renderDashboard();

    // KPI Tiles
    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();

    expect(screen.getByText(/40 published · 2 draft/i)).toBeInTheDocument();
    expect(screen.getByText(/14 active · 3 admins/i)).toBeInTheDocument();
    expect(screen.getByText(/Action needed/i)).toBeInTheDocument();

    // AI Summary
    expect(
      screen.getByText(/AI Runtime Overview \(Today\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText('14,500')).toBeInTheDocument();
    expect(screen.getByText(/320ms avg/i)).toBeInTheDocument();

    // Recent activity
    expect(screen.getByText('product.created')).toBeInTheDocument();
    expect(screen.getByText(/Lead Admin/i)).toBeInTheDocument();

    // Pending review
    expect(screen.getByText('Remarkable battery life')).toBeInTheDocument();
    expect(screen.getByText(/Shopper Rohan/i)).toBeInTheDocument();
  });

  it('renders error state with retry button on API failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'server_error',
            message: 'Failed to fetch dashboard metrics.',
          },
        },
        500,
      ),
    );

    renderDashboard();

    expect(
      await screen.findByText('Unable to load dashboard data'),
    ).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: 'Retry' });
    expect(retryButton).toBeInTheDocument();
  });
});
