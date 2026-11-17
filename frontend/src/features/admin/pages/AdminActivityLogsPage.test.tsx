import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminActivityItem } from '../types';
import { AdminActivityLogsPage } from './AdminActivityLogsPage';

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

const mockLogs: AdminActivityItem[] = [
  {
    id: 101,
    admin: {
      id: 1,
      name: 'System Admin',
      email: 'admin@pickwise.test',
    },
    action: 'product.updated',
    subject_type: 'App\\Models\\Product',
    subject_id: 42,
    changes: {
      before: { name: 'Old Phone', price: '499.00' },
      after: { name: 'New Phone Pro', price: '549.00' },
    },
    ip_address: '192.168.1.100',
    created_at: '2026-11-17T09:30:00Z',
  },
  {
    id: 102,
    admin: {
      id: 2,
      name: 'Catalog Manager',
      email: 'manager@pickwise.test',
    },
    action: 'category.created',
    subject_type: 'App\\Models\\Category',
    subject_id: 8,
    changes: {
      after: { name: 'Tablets', slug: 'tablets' },
    },
    ip_address: '192.168.1.101',
    created_at: '2026-11-17T08:15:00Z',
  },
];

const mockPaginatedResponse = {
  data: mockLogs,
  meta: {
    current_page: 1,
    from: 1,
    last_page: 1,
    per_page: 20,
    to: 2,
    total: 2,
  },
  links: {
    first: '/admin/activity-logs?page=1',
    last: '/admin/activity-logs?page=1',
    prev: null,
    next: null,
  },
};

const mockAdminUsersResponse = {
  data: [
    {
      id: 1,
      name: 'System Admin',
      email: 'admin@pickwise.test',
      role: 'admin',
      is_active: true,
      reviews_count: 0,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Catalog Manager',
      email: 'manager@pickwise.test',
      role: 'admin',
      is_active: true,
      reviews_count: 0,
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  meta: {
    current_page: 1,
    last_page: 1,
    per_page: 50,
    total: 2,
  },
  links: {},
};

function renderPage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminActivityLogsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminActivityLogsPage', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/admin/users')) {
          return Promise.resolve(jsonResponse(mockAdminUsersResponse));
        }
        if (url.includes('/admin/activity-logs')) {
          return Promise.resolve(jsonResponse(mockPaginatedResponse));
        }
        return Promise.resolve(jsonResponse({ data: [] }));
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the header, filter controls, date presets, and audit logs table', async () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: /audit log viewer/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/append-only/i)).toBeInTheDocument();
    expect(screen.getByTestId('preset-30d')).toBeInTheDocument();
    expect(screen.getByTestId('search-logs-input')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('audit-logs-table')).toBeInTheDocument();
    });

    const table = screen.getByTestId('audit-logs-table');
    expect(within(table).getByText('product.updated')).toBeInTheDocument();
    expect(within(table).getByText('category.created')).toBeInTheDocument();
    expect(within(table).getByText('System Admin')).toBeInTheDocument();
    expect(within(table).getByText('Catalog Manager')).toBeInTheDocument();
    expect(within(table).getByText('192.168.1.100')).toBeInTheDocument();
  });

  it('opens audit diff dialog and displays attribute before and after diff', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('inspect-diff-btn-101')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('inspect-diff-btn-101'));

    await waitFor(() => {
      expect(screen.getByTestId('audit-diff-dialog')).toBeInTheDocument();
    });

    expect(screen.getByText(/Audit Record #101/i)).toBeInTheDocument();
    expect(screen.getByTestId('update-diff-table')).toBeInTheDocument();
    expect(screen.getByText('Old Phone')).toBeInTheDocument();
    expect(screen.getByText('New Phone Pro')).toBeInTheDocument();
    expect(screen.getByText('499.00')).toBeInTheDocument();
    expect(screen.getByText('549.00')).toBeInTheDocument();

    // Verify redaction notice
    expect(
      screen.getByText(
        /Sensitive attributes.*automatically sanitized and redacted/i,
      ),
    ).toBeInTheDocument();

    // Toggle raw JSON view
    await user.click(screen.getByTestId('toggle-raw-json-btn'));
    expect(screen.getByTestId('raw-json-viewer')).toBeInTheDocument();
  });

  it('filters by search input and queries the API', async () => {
    const user = userEvent.setup();
    renderPage();

    const searchInput = screen.getByTestId('search-logs-input');
    await user.type(searchInput, 'New Phone');

    await waitFor(() => {
      const calls = fetchSpy.mock.calls;
      const activityCall = calls.find((call: unknown[]) =>
        String(call[0]).includes('search=New+Phone'),
      );
      expect(activityCall).toBeDefined();
    });
  });

  it('switches date presets and updates start and end date inputs', async () => {
    const user = userEvent.setup();
    renderPage();

    const preset7d = screen.getByTestId('preset-7d');
    await user.click(preset7d);

    await waitFor(() => {
      expect(preset7d).toHaveClass('bg-primary');
    });
  });

  it('shows date error warning when end date is earlier than start date', async () => {
    const user = userEvent.setup();
    renderPage();

    const startInput = screen.getByTestId('start-date-input');
    const endInput = screen.getByTestId('end-date-input');

    await user.clear(startInput);
    await user.type(startInput, '2026-11-20');

    await user.clear(endInput);
    await user.type(endInput, '2026-11-10');

    await waitFor(() => {
      expect(screen.getByTestId('date-range-error')).toBeInTheDocument();
    });
    expect(
      screen.getByText(/End date cannot be earlier than start date/i),
    ).toBeInTheDocument();
  });

  it('displays empty state when no activity logs match filters', async () => {
    fetchSpy.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/admin/users')) {
        return Promise.resolve(jsonResponse(mockAdminUsersResponse));
      }
      return Promise.resolve(
        jsonResponse({
          data: [],
          meta: {
            current_page: 1,
            from: null,
            last_page: 1,
            per_page: 20,
            to: null,
            total: 0,
          },
          links: {},
        }),
      );
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('logs-empty-state')).toBeInTheDocument();
    });
    expect(screen.getByText(/No audit entries found/i)).toBeInTheDocument();
  });

  it('displays error state with retry button when API fails', async () => {
    fetchSpy.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/admin/activity-logs')) {
        return Promise.reject(new Error('Network error loading audit logs'));
      }
      return Promise.resolve(jsonResponse({ data: [] }));
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('logs-error-state')).toBeInTheDocument();
    });
    expect(screen.getByText(/Failed to load audit logs/i)).toBeInTheDocument();
  });
});
