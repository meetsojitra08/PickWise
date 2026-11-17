import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AdminKpiTiles } from './AdminKpiTiles';
import type { AdminAiUsageSummary, AdminDashboardCounts } from '../types';

describe('AdminKpiTiles', () => {
  const counts: AdminDashboardCounts = {
    products: { total: 120, published: 110, unpublished: 10 },
    users: { total: 55, active: 50, customers: 48, admins: 2 },
    pending_reviews: 7,
    ai_calls_today: 34,
  };

  const aiUsage: AdminAiUsageSummary = {
    total_calls: 34,
    successful_calls: 33,
    failed_calls: 1,
    total_tokens: 28000,
    avg_latency_ms: 450,
  };

  it('renders all four KPI tiles with tabular numbers and links', () => {
    render(
      <MemoryRouter>
        <AdminKpiTiles counts={counts} aiUsage={aiUsage} />
      </MemoryRouter>,
    );

    // Products tile
    expect(screen.getByText('Total products')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText(/110 published · 10 draft/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Total products: 120/i }),
    ).toHaveAttribute('href', '/admin/products');

    // Users tile
    expect(screen.getByText('Registered users')).toBeInTheDocument();
    expect(screen.getByText('55')).toBeInTheDocument();
    expect(screen.getByText(/50 active · 2 admins/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Registered users: 55/i }),
    ).toHaveAttribute('href', '/admin/users');

    // Pending reviews tile with highlight
    expect(screen.getByText('Pending reviews')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Requires moderation')).toBeInTheDocument();
    expect(screen.getByText('Action needed')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Pending reviews: 7/i }),
    ).toHaveAttribute('href', '/admin/reviews');

    // AI calls today tile
    expect(screen.getByText('AI calls today')).toBeInTheDocument();
    expect(screen.getByText('34')).toBeInTheDocument();
    expect(screen.getByText(/28,000 tokens · 450ms avg/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /AI calls today: 34/i }),
    ).toHaveAttribute('href', '/admin/ai');
  });

  it('displays clean empty/clear state when pending reviews is 0', () => {
    const clearCounts: AdminDashboardCounts = {
      ...counts,
      pending_reviews: 0,
    };

    render(
      <MemoryRouter>
        <AdminKpiTiles counts={clearCounts} aiUsage={aiUsage} />
      </MemoryRouter>,
    );

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Queue is all clear')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });
});
