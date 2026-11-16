import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminReviewsPage } from './AdminReviewsPage';
import type { AdminReview } from '../types';

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

const mockReviews: AdminReview[] = [
  {
    id: 1,
    product: {
      id: 10,
      name: 'Sony WH-1000XM5',
      slug: 'sony-wh-1000xm5',
      is_published: true,
      rating_avg: 4.8,
      rating_count: 12,
    },
    user: {
      id: 2,
      name: 'Alice Green',
      email: 'alice@example.com',
    },
    author_name: 'Alice Green',
    rating: 5,
    title: 'Superb noise cancellation',
    body: 'The active noise cancellation is unmatched.',
    status: 'pending',
    moderator: null,
    moderated_by: null,
    moderated_at: null,
    created_at: '2026-11-10T10:00:00Z',
    updated_at: '2026-11-10T10:00:00Z',
  },
  {
    id: 2,
    product: {
      id: 11,
      name: 'Apple MacBook Air M3',
      slug: 'apple-macbook-air-m3',
      is_published: true,
      rating_avg: 4.7,
      rating_count: 8,
    },
    user: null,
    author_name: 'Showcase Customer',
    rating: 3,
    title: 'Decent but expensive',
    body: 'Good laptop but the upgrade pricing is high.',
    status: 'pending',
    moderator: null,
    moderated_by: null,
    moderated_at: null,
    created_at: '2026-11-12T14:30:00Z',
    updated_at: '2026-11-12T14:30:00Z',
  },
];

function renderAdminReviewsPage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminReviewsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminReviewsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders review moderation page and displays pending reviews queue', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse({
        data: mockReviews,
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 2 },
        links: {},
      }),
    );

    renderAdminReviewsPage();

    expect(
      screen.getByRole('heading', { name: 'Review Moderation' }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText('Superb noise cancellation'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Decent but expensive'),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Sony WH-1000XM5')).toBeInTheDocument();
    expect(screen.getByText('Apple MacBook Air M3')).toBeInTheDocument();
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
  });

  it('filters reviews by status when clicking status filter buttons', async () => {
    const user = userEvent.setup();

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url.includes('status=approved')) {
        return Promise.resolve(
          jsonResponse({
            data: [
              {
                ...mockReviews[0],
                status: 'approved',
              },
            ],
            meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
            links: {},
          }),
        );
      }
      return Promise.resolve(
        jsonResponse({
          data: mockReviews,
          meta: { current_page: 1, last_page: 1, per_page: 20, total: 2 },
          links: {},
        }),
      );
    });

    renderAdminReviewsPage();

    await waitFor(() => {
      expect(
        screen.getByText('Superb noise cancellation'),
      ).toBeInTheDocument();
    });

    const approvedButton = screen.getByRole('button', { name: 'Approved' });
    await user.click(approvedButton);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('status=approved'),
        expect.anything(),
      );
    });
  });

  it('approves a pending review upon clicking Approve', async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({
          data: [mockReviews[0]],
          meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
          links: {},
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            ...mockReviews[0],
            status: 'approved',
            moderated_by: 1,
            moderated_at: '2026-11-16T12:00:00Z',
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: [],
          meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
          links: {},
        }),
      );

    renderAdminReviewsPage();

    await waitFor(() => {
      expect(
        screen.getByText('Superb noise cancellation'),
      ).toBeInTheDocument();
    });

    const approveButton = screen.getByRole('button', { name: 'Approve' });
    await user.click(approveButton);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/reviews/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'approved' }),
        }),
      );
    });
  });

  it('opens reject dialog, enters reason, and confirms rejection', async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({
          data: [mockReviews[0]],
          meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
          links: {},
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            ...mockReviews[0],
            status: 'rejected',
            moderated_by: 1,
            moderated_at: '2026-11-16T12:00:00Z',
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: [],
          meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
          links: {},
        }),
      );

    renderAdminReviewsPage();

    await waitFor(() => {
      expect(
        screen.getByText('Superb noise cancellation'),
      ).toBeInTheDocument();
    });

    const rejectButton = screen.getByRole('button', { name: 'Reject' });
    await user.click(rejectButton);

    expect(
      screen.getByRole('heading', { name: 'Reject Review' }),
    ).toBeInTheDocument();

    const reasonInput = screen.getByPlaceholderText(/e\.g\., Promotional external links/i);
    await user.type(reasonInput, 'Contains external marketing links');

    const confirmButton = screen.getByRole('button', {
      name: 'Confirm Rejection',
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/reviews/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            status: 'rejected',
            reason: 'Contains external marketing links',
          }),
        }),
      );
    });
  });

  it('opens delete confirmation dialog and deletes review', async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({
          data: [mockReviews[0]],
          meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
          links: {},
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [],
          meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
          links: {},
        }),
      );

    renderAdminReviewsPage();

    await waitFor(() => {
      expect(
        screen.getByText('Superb noise cancellation'),
      ).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', {
      name: 'Delete review 1',
    });
    await user.click(deleteButton);

    expect(
      screen.getByRole('heading', { name: 'Delete Review' }),
    ).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole('button', {
      name: 'Delete Review',
    });
    await user.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/reviews/1'),
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });
  });

  it('supports selecting reviews and bulk approving them', async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({
          data: mockReviews,
          meta: { current_page: 1, last_page: 1, per_page: 20, total: 2 },
          links: {},
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { count: 2, status: 'approved' },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: [],
          meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
          links: {},
        }),
      );

    renderAdminReviewsPage();

    await waitFor(() => {
      expect(
        screen.getByText('Superb noise cancellation'),
      ).toBeInTheDocument();
    });

    const selectAllCheckbox = screen.getByLabelText(
      'Select all reviews on this page',
    );
    await user.click(selectAllCheckbox);

    expect(screen.getByTestId('admin-bulk-action-bar')).toBeInTheDocument();
    expect(screen.getByText('2 reviews selected')).toBeInTheDocument();

    const bulkApproveBtn = screen.getByRole('button', {
      name: 'Approve Selected',
    });
    await user.click(bulkApproveBtn);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/reviews/bulk-status'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            review_ids: [1, 2],
            status: 'approved',
          }),
        }),
      );
    });
  });

  it('displays empty queue state when no reviews are pending', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse({
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
        links: {},
      }),
    );

    renderAdminReviewsPage();

    await waitFor(() => {
      expect(
        screen.getByText('No reviews waiting for approval'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /All submitted shopper reviews have been moderated/i,
        ),
      ).toBeInTheDocument();
    });
  });
});
