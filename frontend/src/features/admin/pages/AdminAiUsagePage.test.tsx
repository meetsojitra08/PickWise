import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminAiUsageData } from '../types';
import { AdminAiUsagePage } from './AdminAiUsagePage';

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

const mockAiUsageData: AdminAiUsageData = {
  summary: {
    total_calls: 150,
    successful_calls: 142,
    failed_calls: 8,
    error_calls: 5,
    rate_limited_calls: 3,
    error_rate: 5.33,
    total_tokens: 85000,
    prompt_tokens: 60000,
    completion_tokens: 25000,
    avg_latency_ms: 680,
  },
  by_feature: [
    {
      feature: 'assistant',
      total_calls: 95,
      successful_calls: 92,
      failed_calls: 3,
      total_tokens: 55000,
      avg_latency_ms: 710,
    },
    {
      feature: 'compare',
      total_calls: 35,
      successful_calls: 32,
      failed_calls: 3,
      total_tokens: 20000,
      avg_latency_ms: 820,
    },
    {
      feature: 'review_summary',
      total_calls: 20,
      successful_calls: 18,
      failed_calls: 2,
      total_tokens: 10000,
      avg_latency_ms: 510,
    },
  ],
  daily_usage: [
    {
      date: '2026-11-14',
      total_calls: 40,
      successful_calls: 38,
      failed_calls: 2,
      total_tokens: 22000,
      avg_latency_ms: 650,
      by_feature: { assistant: 25, compare: 10, review_summary: 5 },
    },
    {
      date: '2026-11-15',
      total_calls: 55,
      successful_calls: 52,
      failed_calls: 3,
      total_tokens: 31000,
      avg_latency_ms: 690,
      by_feature: { assistant: 35, compare: 12, review_summary: 8 },
    },
    {
      date: '2026-11-16',
      total_calls: 55,
      successful_calls: 52,
      failed_calls: 3,
      total_tokens: 32000,
      avg_latency_ms: 700,
      by_feature: { assistant: 35, compare: 13, review_summary: 7 },
    },
  ],
  top_users: [
    {
      user_id: 1,
      name: 'Alice Johnson',
      email: 'alice@example.com',
      total_calls: 48,
      total_tokens: 28000,
      last_active_at: '2026-11-16T10:15:00Z',
    },
    {
      user_id: 2,
      name: 'Bob Smith',
      email: 'bob@example.com',
      total_calls: 32,
      total_tokens: 18000,
      last_active_at: '2026-11-16T11:45:00Z',
    },
  ],
  guest_calls: 70,
  logs: [
    {
      id: 101,
      user: {
        id: 1,
        name: 'Alice Johnson',
        email: 'alice@example.com',
      },
      feature: 'assistant',
      model: 'llama-3.3-70b-versatile',
      prompt_tokens: 450,
      completion_tokens: 180,
      total_tokens: 630,
      latency_ms: 650,
      status: 'ok',
      error_code: null,
      created_at: '2026-11-16T11:58:00Z',
    },
    {
      id: 102,
      user: null,
      feature: 'compare',
      model: 'llama-3.3-70b-versatile',
      prompt_tokens: 620,
      completion_tokens: 0,
      total_tokens: 620,
      latency_ms: 920,
      status: 'error',
      error_code: 'provider_timeout',
      created_at: '2026-11-16T11:50:00Z',
    },
    {
      id: 103,
      user: null,
      feature: 'assistant',
      model: null,
      prompt_tokens: null,
      completion_tokens: null,
      total_tokens: 0,
      latency_ms: null,
      status: 'rate_limited',
      error_code: 'ai_quota_exceeded',
      created_at: '2026-11-16T11:40:00Z',
    },
  ],
  pagination: {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 3,
  },
  date_range: {
    start_date: '2026-10-18',
    end_date: '2026-11-16',
  },
};

function renderPage() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <AdminAiUsagePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminAiUsagePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading skeleton while fetching data', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByTestId('ai-usage-skeleton')).toBeInTheDocument();
  });

  it('renders error state and handles retry', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: 'server_error',
              message: 'Failed to load AI metrics from server',
            },
          },
          500,
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ data: mockAiUsageData }));

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('admin-ai-error')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Failed to load AI metrics from server'),
    ).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByTestId('kpi-total-calls')).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('renders KPI tiles, charts, feature breakdown, top users, and logs table', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ data: mockAiUsageData }),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('kpi-total-calls')).toHaveTextContent('150');
    });

    // Check KPI metrics
    expect(screen.getByTestId('kpi-success-rate')).toHaveTextContent('94.7%');
    expect(screen.getByTestId('kpi-total-tokens')).toHaveTextContent('85,000');
    expect(screen.getByTestId('kpi-avg-latency')).toHaveTextContent('680 ms');

    // Check Daily Chart
    expect(screen.getByTestId('ai-usage-chart')).toBeInTheDocument();

    // Check Feature breakdown
    expect(
      screen.getByTestId('feature-breakdown-assistant'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('feature-breakdown-compare')).toBeInTheDocument();
    expect(
      screen.getByTestId('feature-breakdown-review_summary'),
    ).toBeInTheDocument();

    // Check Top Users & Guest badge
    expect(screen.getByTestId('guest-calls-badge')).toHaveTextContent('70');
    expect(screen.getByTestId('top-user-row-1')).toHaveTextContent(
      'Alice Johnson',
    );
    expect(screen.getByTestId('top-user-row-2')).toHaveTextContent('Bob Smith');

    // Check Logs Table
    expect(screen.getByTestId('ai-log-row-101')).toHaveTextContent(
      'Alice Johnson',
    );
    expect(screen.getByTestId('ai-log-row-102')).toHaveTextContent('Guest');
    expect(screen.getByTestId('ai-log-row-102')).toHaveTextContent(
      'provider_timeout',
    );
    expect(screen.getByTestId('ai-log-row-103')).toHaveTextContent('Throttled');
  });

  it('handles date presets and filter dropdown changes', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: mockAiUsageData }));

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('kpi-total-calls')).toBeInTheDocument();
    });

    // Click 7D preset
    const preset7d = screen.getByTestId('preset-7d');
    await user.click(preset7d);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    // Change feature to assistant
    const featureSelect = screen.getByTestId('feature-select');
    await user.selectOptions(featureSelect, 'assistant');

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    // Change status to error
    const statusSelect = screen.getByTestId('status-select');
    await user.selectOptions(statusSelect, 'error');

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });

    // Click reset button
    const resetButton = screen.getByTestId('reset-filters-button');
    await user.click(resetButton);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(5);
    });
  });

  it('renders empty states gracefully when no calls are returned', async () => {
    const emptyData: AdminAiUsageData = {
      summary: {
        total_calls: 0,
        successful_calls: 0,
        failed_calls: 0,
        error_calls: 0,
        rate_limited_calls: 0,
        error_rate: 0,
        total_tokens: 0,
        prompt_tokens: 0,
        completion_tokens: 0,
        avg_latency_ms: 0,
      },
      by_feature: [],
      daily_usage: [],
      top_users: [],
      guest_calls: 0,
      logs: [],
      pagination: {
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: 0,
      },
      date_range: {
        start_date: '2026-10-18',
        end_date: '2026-11-16',
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ data: emptyData }),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('ai-chart-empty')).toBeInTheDocument();
    });

    expect(screen.getByTestId('top-users-empty')).toBeInTheDocument();
    expect(screen.getByTestId('ai-logs-empty')).toBeInTheDocument();
  });
});
