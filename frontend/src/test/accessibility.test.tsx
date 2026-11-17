import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppLayout } from '@/app/layouts/AppLayout';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { ThemeProvider } from '@/app/ThemeProvider';
import { RatingStars } from '@/components/shared/RatingStars';
import { FitMeter, VerdictPanel } from '@/components/shared/VerdictPanel';
import { AuthPageShell } from '@/features/auth/components/AuthPageShell';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { ProductSpecifications } from '@/features/catalog/components/ProductSpecifications';
import { ReviewDistribution } from '@/features/reviews/components/ReviewDistribution';

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

describe('Accessibility Standards Audit (P8-S3)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ data: null }),
    ));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Skip links and Landmarks', () => {
    it('provides accessible skip link and matching main landmark in AppLayout', () => {
      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <ThemeProvider>
            <AuthProvider>
              <MemoryRouter>
                <AppLayout />
              </MemoryRouter>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>,
      );

      const skipLink = screen.getByRole('link', { name: /skip to main content/i });
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');

      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('id', 'main-content');
      expect(main).toHaveAttribute('tabIndex', '-1');
    });

    it('provides accessible skip link in AuthLayout targeting #auth-main-content', () => {
      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <ThemeProvider>
            <AuthProvider>
              <MemoryRouter>
                <Routes>
                  <Route element={<AuthLayout />}>
                    <Route
                      index
                      element={
                        <AuthPageShell
                          title="Sign in"
                          description="Enter your credentials."
                          footer={<p>Footer</p>}
                        >
                          <form>
                            <input aria-label="Email" />
                          </form>
                        </AuthPageShell>
                      }
                    />
                  </Route>
                </Routes>
              </MemoryRouter>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>,
      );

      const skipLink = screen.getByRole('link', { name: /skip to auth content/i });
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#auth-main-content');

      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('id', 'auth-main-content');
      expect(main).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Table Semantics & Fallbacks', () => {
    it('renders ProductSpecifications table with caption, col/row scopes, and accessible headers', () => {
      const mockSpecs = [
        {
          key: 'processor',
          label: 'Processor',
          value: 'Apple M3 Pro',
          unit: null,
          data_type: 'text' as const,
          is_comparable: false,
          higher_is_better: null,
        },
        {
          key: 'ram',
          label: 'Memory',
          value: 36,
          unit: 'GB',
          data_type: 'number' as const,
          is_comparable: true,
          higher_is_better: true,
        },
      ];

      render(<ProductSpecifications specs={mockSpecs} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      const caption = table.querySelector('caption');
      expect(caption).toBeInTheDocument();
      expect(caption).toHaveTextContent(/product technical specifications/i);

      const colHeaders = screen.getAllByRole('columnheader', { hidden: true });
      expect(colHeaders.length).toBe(2);
      expect(colHeaders[0]).toHaveAttribute('scope', 'col');

      const rowHeaders = screen.getAllByRole('rowheader');
      expect(rowHeaders.length).toBe(2);
      expect(rowHeaders[0]).toHaveAttribute('scope', 'row');
      expect(rowHeaders[0]).toHaveTextContent('Processor');
      expect(rowHeaders[1]).toHaveTextContent('Memory');
    });
  });

  describe('Rating & Progress Bar Accessibility', () => {
    it('presents RatingStars with semantic img role and descriptive aria-label', () => {
      render(<RatingStars rating={4.3} count={28} />);

      const ratingImg = screen.getByRole('img', {
        name: /rated 4\.3 out of 5 based on 28 reviews/i,
      });
      expect(ratingImg).toBeInTheDocument();
    });

    it('presents ReviewDistribution progress bars with role="progressbar" and aria-valuetext', () => {
      const mockDistribution = {
        5: 20,
        4: 10,
        3: 5,
        2: 2,
        1: 1,
      };

      render(<ReviewDistribution distribution={mockDistribution} />);

      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBe(5);

      // Total = 38
      // 5-star has 20 -> 53%
      expect(progressBars[0]).toHaveAttribute('aria-label', '5 star reviews');
      expect(progressBars[0]).toHaveAttribute('aria-valuenow', '20');
      expect(progressBars[0]).toHaveAttribute('aria-valuemin', '0');
      expect(progressBars[0]).toHaveAttribute('aria-valuemax', '38');
      expect(progressBars[0]).toHaveAttribute(
        'aria-valuetext',
        '20 of 38 reviews (53%)',
      );
    });
  });

  describe('Verdict & Fit Meter Semantics', () => {
    it('renders FitMeter with role="meter" and full range values', () => {
      render(<FitMeter score={87} label="Fit" />);

      const meter = screen.getByRole('meter', { name: /fit: 87 out of 100/i });
      expect(meter).toBeInTheDocument();
      expect(meter).toHaveAttribute('aria-valuenow', '87');
      expect(meter).toHaveAttribute('aria-valuemin', '0');
      expect(meter).toHaveAttribute('aria-valuemax', '100');
    });

    it('renders VerdictPanel error state with role="alert"', () => {
      render(
        <VerdictPanel
          status="error"
          errorMessage="AI engine timed out. Please retry."
        />,
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/could not generate verdict/i);
      expect(alert).toHaveTextContent(/ai engine timed out/i);
    });

    it('renders VerdictPanel loading state with role="status" and aria-busy', () => {
      render(<VerdictPanel status="loading" />);

      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toBeInTheDocument();
      expect(statusRegion).toHaveAttribute('aria-busy', 'true');
    });
  });
});
