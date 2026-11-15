import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompareVerdictSection } from '@/features/compare/components/CompareVerdictSection';
import type { CompareVerdictResponse } from '@/features/compare/types/compare';
import type { SavedComparisonVerdict } from '@/features/compare/types/saved-comparison';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const mockVerdictData: CompareVerdictResponse = {
  data: {
    verdict:
      'Lenovo Yoga is best for value-focused buyers, while MacBook Air excels in battery endurance.',
    products: [
      {
        product_id: 14,
        name: 'Lenovo Yoga',
        strengths: ['Great value for specs', 'Versatile touchscreen'],
        weaknesses: ['Shorter battery life'],
      },
      {
        product_id: 22,
        name: 'MacBook Air',
        strengths: ['18-hour battery life', 'Silent fanless design'],
        weaknesses: ['Higher starting price', 'Limited port selection'],
      },
    ],
    quota: {
      limit: 5,
      used: 1,
      remaining: 4,
      resets_at: '2026-11-16T00:00:00Z',
    },
    comparison_id: null,
  },
};

function renderComponent(
  props: Partial<Parameters<typeof CompareVerdictSection>[0]> = {},
  initialQuota?: {
    limit: number;
    used: number;
    remaining: number;
    resets_at: string;
  },
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  if (initialQuota) {
    queryClient.setQueryData(['assistant', 'quota'], initialQuota);
  }

  const defaultProps = {
    productIds: [14, 22],
    ...props,
  };

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <CompareVerdictSection {...defaultProps} />
      </QueryClientProvider>,
    ),
  };
}

describe('CompareVerdictSection', () => {
  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=test-token; path=/';
    vi.restoreAllMocks();
  });

  it('renders idle state with Get AI verdict button and optional priority input', () => {
    renderComponent();

    expect(
      screen.getByRole('heading', {
        name: 'Get an AI verdict on this comparison',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Get AI verdict' }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('What matters most to you? (optional)'),
    ).toBeInTheDocument();
  });

  it('generates a verdict without priority and displays product strengths and weaknesses', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        const method = init?.method ?? 'GET';

        if (url === '/api/v1/compare/verdict' && method === 'POST') {
          return jsonResponse(mockVerdictData, 200);
        }

        return jsonResponse({}, 404);
      });

    const onVerdictChange = vi.fn();
    renderComponent({ onVerdictChange });

    const generateBtn = screen.getByRole('button', { name: 'Get AI verdict' });
    await user.click(generateBtn);

    // Verify request payload
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/compare/verdict',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    const postCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        url === '/api/v1/compare/verdict' && init?.method === 'POST',
    );
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      product_ids: [14, 22],
    });

    // Check ready state rendered
    expect(
      await screen.findByRole('heading', {
        name: /Lenovo Yoga is best for value-focused buyers/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText('Great value for specs')).toBeInTheDocument();
    expect(screen.getByText('Shorter battery life')).toBeInTheDocument();
    expect(screen.getByText('18-hour battery life')).toBeInTheDocument();
    expect(screen.getByText('Higher starting price')).toBeInTheDocument();

    // Check regenerate button is available
    expect(
      screen.getByRole('button', { name: 'Regenerate' }),
    ).toBeInTheDocument();

    // Callback notified
    expect(onVerdictChange).toHaveBeenCalledWith(
      expect.objectContaining({
        verdict: mockVerdictData.data.verdict,
      }),
    );
  });

  it('sends optional priority when specified by the shopper', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        const method = init?.method ?? 'GET';

        if (url === '/api/v1/compare/verdict' && method === 'POST') {
          return jsonResponse(mockVerdictData, 200);
        }

        return jsonResponse({}, 404);
      });

    renderComponent();

    const input = screen.getByLabelText('What matters most to you? (optional)');
    await user.type(input, 'battery life and light travel');

    const generateBtn = screen.getByRole('button', { name: 'Get AI verdict' });
    await user.click(generateBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/compare/verdict',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    const postCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        url === '/api/v1/compare/verdict' && init?.method === 'POST',
    );
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      product_ids: [14, 22],
      priority: 'battery life and light travel',
    });
  });

  it('renders initial saved verdict immediately without calling API', () => {
    const initialVerdict: SavedComparisonVerdict = {
      verdict: 'MacBook Air is the winner for endurance.',
      products: [
        {
          product_id: 14,
          name: 'Lenovo Yoga',
          strengths: ['Touchscreen flexibility'],
          weaknesses: ['Lower battery'],
        },
        {
          product_id: 22,
          name: 'MacBook Air',
          strengths: ['Class-leading endurance'],
          weaknesses: ['Price'],
        },
      ],
      generated_at: '2026-11-14T10:00:00Z',
    };

    const fetchMock = vi.spyOn(globalThis, 'fetch');
    renderComponent({ initialVerdict });

    expect(
      screen.getByRole('heading', {
        name: 'MacBook Air is the winner for endurance.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Touchscreen flexibility')).toBeInTheDocument();
    expect(screen.getByText('Class-leading endurance')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/v1/compare/verdict',
      expect.anything(),
    );
  });

  it('handles error state with retry button', async () => {
    const user = userEvent.setup();
    let attempt = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url === '/api/v1/compare/verdict' && method === 'POST') {
        attempt++;
        if (attempt === 1) {
          return jsonResponse(
            {
              error: {
                status: 503,
                code: 'ai_unavailable',
                message: 'AI service temporarily unavailable.',
              },
            },
            503,
          );
        }
        return jsonResponse(mockVerdictData, 200);
      }

      return jsonResponse({}, 404);
    });

    renderComponent();

    await user.click(screen.getByRole('button', { name: 'Get AI verdict' }));

    expect(
      await screen.findByRole('heading', {
        name: 'Could not generate verdict',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('AI service temporarily unavailable.'),
    ).toBeInTheDocument();

    // Click retry
    const retryBtn = screen.getByRole('button', { name: 'Retry' });
    await user.click(retryBtn);

    expect(
      await screen.findByRole('heading', {
        name: /Lenovo Yoga is best for value-focused buyers/i,
      }),
    ).toBeInTheDocument();
  });

  it('handles quota exceeded state when 429 is returned', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url === '/api/v1/compare/verdict' && method === 'POST') {
        return jsonResponse(
          {
            error: {
              status: 429,
              code: 'ai_quota_exceeded',
              message: "You've used today's AI answers.",
            },
          },
          429,
        );
      }

      return jsonResponse({}, 404);
    });

    renderComponent();

    await user.click(screen.getByRole('button', { name: 'Get AI verdict' }));

    expect(
      await screen.findByRole('heading', {
        name: 'Daily AI quota reached',
      }),
    ).toBeInTheDocument();
  });

  it('renders quota exceeded immediately if daily quota is already exhausted', () => {
    renderComponent(
      {},
      { limit: 5, used: 5, remaining: 0, resets_at: '2026-11-16T00:00:00Z' },
    );

    expect(
      screen.getByRole('heading', {
        name: 'Daily AI quota reached',
      }),
    ).toBeInTheDocument();
  });
});
