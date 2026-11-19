/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminLayout } from '@/app/layouts/AdminLayout';
import { AppLayout } from '@/app/layouts/AppLayout';
import { HomePage } from '@/app/pages/HomePage';
import { ThemeProvider } from '@/app/ThemeProvider';
import { PickwiseLogo } from '@/components/shared/PickwiseLogo';
import { UserMenu } from '@/components/shared/UserMenu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminAiLogsTable } from '@/features/admin/components/AdminAiLogsTable';
import { AdminAiTopUsersCard } from '@/features/admin/components/AdminAiTopUsersCard';
import { AssistantConversationList } from '@/features/assistant/components/AssistantConversationList';
import { AssistantRecommendationCard } from '@/features/assistant/components/AssistantRecommendationCard';
import { AssistantThreadMessage } from '@/features/assistant/components/AssistantThreadMessage';
import { AuthPageShell } from '@/features/auth/components/AuthPageShell';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import {
  AuthContext,
  type AuthContextValue,
} from '@/features/auth/hooks/auth-context';
import { ProductFacts } from '@/features/catalog/components/ProductFacts';
import { ProductSpecifications } from '@/features/catalog/components/ProductSpecifications';
import { CompareMatrix } from '@/features/compare/components/CompareMatrix';
import { CompareProvider } from '@/features/compare/components/CompareProvider';
import type { ProductDetail } from '@/features/catalog/types/catalog-api';
import type { CompareMatrixData } from '@/features/compare/types/compare';

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

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      results.push(...collectSourceFiles(fullPath));
    } else if (fullPath.endsWith('.tsx') && !fullPath.endsWith('.test.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

const adminAuth: AuthContextValue = {
  user: {
    id: 1,
    name: 'Aarav Sharma',
    email: 'aarav@example.com',
    role: 'admin',
    preferences: null,
    is_active: true,
    email_verified_at: null,
    created_at: '2026-01-01T00:00:00Z',
  },
  status: 'authenticated',
  isLoading: false,
  isAuthenticated: true,
  isAdmin: true,
  authError: null,
  login: async () => {
    throw new Error('Not implemented');
  },
  register: async () => {
    throw new Error('Not implemented');
  },
  logout: async () => {},
  refetchUser: async () => null,
};

const sampleProduct: ProductDetail = {
  id: 101,
  name: 'Northstar Studio 14',
  slug: 'northstar-studio-14',
  summary: 'Balanced creator laptop for editing on the go.',
  description: 'Full metal chassis with OLED display.',
  price: { amount: '89999.00', currency: 'INR' },
  availability: 'in_stock',
  availability_label: 'In Stock',
  store_url: 'https://store.example.com/studio-14',
  rating_avg: 4.6,
  rating_count: 18,
  value_score: 88,
  category: { id: 1, name: 'Laptops', slug: 'laptops' },
  brand: { id: 1, name: 'Northstar', slug: 'northstar', logo_url: null },
  primary_image: {
    id: 1,
    url: 'https://images.example.com/studio-14.webp',
    alt_text: 'Northstar Studio 14',
  },
  images: [],
  specs: [
    {
      key: 'ram',
      label: 'Memory',
      unit: 'GB',
      data_type: 'number',
      value: 32,
      is_comparable: true,
      higher_is_better: true,
    },
  ],
  review_summary: null,
  created_at: '2026-11-01T00:00:00Z',
};

const sampleMatrix: CompareMatrixData = {
  category: { id: 1, name: 'Laptops', slug: 'laptops' },
  products: [
    {
      id: 1,
      name: 'MacBook Air M3',
      slug: 'macbook-air-m3',
      summary: 'Thin and light.',
      price: { amount: '99900.00', currency: 'INR' },
      availability: 'in_stock',
      availability_label: 'In Stock',
      rating_avg: 4.8,
      rating_count: 42,
      value_score: 91,
      category: { id: 1, name: 'Laptops', slug: 'laptops' },
      brand: { id: 1, name: 'Apple', slug: 'apple', logo_url: null },
      primary_image: null,
      created_at: '2026-11-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Dell XPS 13',
      slug: 'dell-xps-13',
      summary: 'Compact Windows ultrabook.',
      price: { amount: '94900.00', currency: 'INR' },
      availability: 'in_stock',
      availability_label: 'In Stock',
      rating_avg: 4.5,
      rating_count: 27,
      value_score: 86,
      category: { id: 1, name: 'Laptops', slug: 'laptops' },
      brand: { id: 2, name: 'Dell', slug: 'dell', logo_url: null },
      primary_image: null,
      created_at: '2026-11-01T00:00:00Z',
    },
  ],
  rows: [
    {
      key: 'ram',
      label: 'RAM',
      unit: 'GB',
      data_type: 'number',
      higher_is_better: true,
      winner_product_id: 1,
      values: [
        { product_id: 1, value: 24 },
        { product_id: 2, value: 16 },
      ],
    },
  ],
};

describe('Responsive Layout Audit (P8-S5: 320px to 1440px)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: [],
          meta: { current_page: 1, per_page: 24, total: 0, last_page: 1 },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Core layouts & viewport safety', () => {
    it('uses min-w-0 on AppLayout main and h-dvh on /assistant', () => {
      const { container } = render(
        <QueryClientProvider client={createTestQueryClient()}>
          <ThemeProvider>
            <AuthProvider>
              <MemoryRouter initialEntries={['/assistant']}>
                <Routes>
                  <Route element={<AppLayout />}>
                    <Route path="/assistant" element={<div>Assistant</div>} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>,
      );

      const shell = container.firstElementChild as HTMLElement;
      expect(shell.className).toContain('h-dvh');
      expect(shell.className).not.toContain('h-screen');

      const main = screen.getByRole('main');
      expect(main.className).toContain('min-w-0');
    });

    it('guards AdminLayout main with min-w-0 and keeps mobile header controls compact', () => {
      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <ThemeProvider>
            <AuthContext.Provider value={adminAuth}>
              <MemoryRouter initialEntries={['/admin']}>
                <Routes>
                  <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<div>Overview</div>} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </AuthContext.Provider>
          </ThemeProvider>
        </QueryClientProvider>,
      );

      const main = screen.getByRole('main');
      expect(main.className).toContain('min-w-0');

      const accountTrigger = screen.getByRole('button', {
        name: /account menu for aarav sharma/i,
      });
      expect(
        accountTrigger.querySelector('.hidden.sm\\:inline'),
      ).not.toBeNull();
    });

    it('hides PickwiseLogo suffix badge below sm to prevent 320px header crowding', () => {
      render(
        <MemoryRouter>
          <PickwiseLogo to="/admin" labelSuffix="Admin" />
        </MemoryRouter>,
      );

      const suffix = screen.getByText('Admin');
      expect(suffix.className).toContain('hidden');
      expect(suffix.className).toContain('sm:inline-flex');
    });

    it('keeps AuthPageShell clear of the top-right ThemeToggle on narrow viewports', () => {
      render(
        <MemoryRouter>
          <AuthPageShell
            title="Log in"
            description="Welcome back."
            footer={<p>Footer</p>}
          >
            <div />
          </AuthPageShell>
        </MemoryRouter>,
      );

      const main = screen.getByRole('main');
      expect(main.className).toContain('pt-16');
      expect(main.className).toContain('min-h-dvh');
    });

    it('renders UserMenu compactly on narrow viewports while preserving accessible label', () => {
      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <AuthContext.Provider value={adminAuth}>
            <MemoryRouter>
              <UserMenu />
            </MemoryRouter>
          </AuthContext.Provider>
        </QueryClientProvider>,
      );

      const trigger = screen.getByRole('button', {
        name: /account menu for aarav sharma/i,
      });
      expect(trigger.className).toContain('min-h-11');
      expect(screen.getByText('Aarav Sharma').className).toContain('hidden');
      expect(screen.getByText('Aarav Sharma').className).toContain('sm:inline');
    });
  });

  describe('Dialog & design-token hygiene', () => {
    it('gives DialogContent mobile horizontal margins, viewport max-height scrolling, and rounded-surface', () => {
      render(
        <Dialog open onOpenChange={() => {}}>
          <DialogContent>
            <DialogTitle>Responsive dialog</DialogTitle>
            <DialogDescription>Fits cleanly at 320px.</DialogDescription>
          </DialogContent>
        </Dialog>,
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog.className).toContain('w-[calc(100%-1.5rem)]');
      expect(dialog.className).toContain('max-h-[90dvh]');
      expect(dialog.className).toContain('overflow-y-auto');
      expect(dialog.className).toContain('rounded-surface');
      expect(dialog.className).not.toContain('rounded-panel');
    });

    it('contains no undefined rounded-panel classes across frontend components', () => {
      const files = collectSourceFiles(resolve(process.cwd(), 'src'));
      const offenders = files.filter((filePath) =>
        readFileSync(filePath, 'utf8').includes('rounded-panel'),
      );
      expect(offenders).toEqual([]);
    });
  });

  describe('Storefront responsive patterns', () => {
    it('stacks HomePage hero search below sm and collapses comparison table below md', () => {
      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <AuthContext.Provider value={adminAuth}>
            <CompareProvider>
              <MemoryRouter>
                <HomePage />
              </MemoryRouter>
            </CompareProvider>
          </AuthContext.Provider>
        </QueryClientProvider>,
      );

      const searchForm = screen.getByRole('search', {
        name: /shopping assistant search/i,
      });
      expect(searchForm.className).toContain('flex-col');
      expect(searchForm.className).toContain('sm:flex-row');

      const comparisonTable = screen.getByRole('table');
      expect(comparisonTable.className).toContain('block');
      expect(comparisonTable.className).toContain('md:table');

      const thead = comparisonTable.querySelector('thead');
      expect(thead?.className).toContain('hidden');
      expect(thead?.className).toContain('md:table-header-group');
    });

    it('keeps Wishlist and Compare buttons available on mobile inside ProductFacts', () => {
      render(
        <MemoryRouter>
          <ProductFacts
            product={sampleProduct}
            isWishlisted={false}
            wishlistPending={false}
            isCompared={false}
            compareDisabled={false}
            onWishlistToggle={() => {}}
            onCompareToggle={() => {}}
          />
        </MemoryRouter>,
      );

      const wishlistBtn = screen.getByRole('button', {
        name: /add to wishlist/i,
      });
      const compareBtn = screen.getByRole('button', {
        name: /add to comparison/i,
      });

      expect(wishlistBtn.parentElement?.className).not.toContain('hidden');
      expect(compareBtn.parentElement?.className).not.toContain('hidden');
      expect(wishlistBtn.className).toContain('flex-1');
      expect(compareBtn.className).toContain('flex-1');

      const desktopStoreLink = screen.getByRole('link', {
        name: /view on store/i,
      });
      expect(desktopStoreLink.className).toContain('hidden');
      expect(desktopStoreLink.className).toContain('md:inline-flex');
    });

    it('collapses ProductSpecifications rows cleanly on narrow screens', () => {
      render(<ProductSpecifications specs={sampleProduct.specs} />);

      const table = screen.getByRole('table');
      expect(table.className).toContain('block');
      expect(table.className).toContain('sm:table');

      const row = table.querySelector('tbody tr');
      expect(row?.className).toContain('flex-col');
      expect(row?.className).toContain('sm:table-row');
    });

    it('keeps CompareMatrix horizontally scrollable with a compact mobile sticky first column', () => {
      render(
        <MemoryRouter>
          <CompareMatrix matrix={sampleMatrix} />
        </MemoryRouter>,
      );

      const table = screen.getByRole('table');
      expect(table.parentElement?.className).toContain('overflow-x-auto');

      const specHeader = screen.getByRole('columnheader', {
        name: /specification/i,
      });
      expect(specHeader.className).toContain('sticky');
      expect(specHeader.className).toContain('left-0');
      expect(specHeader.className).toContain('min-w-28');
      expect(specHeader.className).toContain('sm:min-w-40');
    });

    it('makes Assistant thread, recommendation card footer, and history delete controls touch-friendly', () => {
      const { container } = render(
        <QueryClientProvider client={createTestQueryClient()}>
          <AuthContext.Provider value={adminAuth}>
            <CompareProvider>
              <MemoryRouter>
                <AssistantThreadMessage
                  message={{
                    id: 1,
                    role: 'assistant',
                    content: 'Here is a strong match within your budget.',
                    status: 'ok',
                    recommendations: [
                      {
                        product_id: sampleProduct.id,
                        reason: 'Strong memory and display value.',
                        tradeoffs: ['No HDMI port'],
                        product: sampleProduct,
                      },
                    ],
                    alternatives: [],
                    created_at: '2026-11-18T12:00:00Z',
                  }}
                />
                <AssistantRecommendationCard
                  recommendation={{
                    product_id: sampleProduct.id,
                    reason: 'Strong memory and display value.',
                    tradeoffs: ['No HDMI port'],
                    product: sampleProduct,
                  }}
                />
                <AssistantConversationList
                  conversations={[
                    {
                      id: 1,
                      title: 'Laptop under 90k',
                      messages_count: 2,
                      last_message_at: '2026-11-18T12:00:00Z',
                      created_at: '2026-11-18T11:55:00Z',
                      updated_at: '2026-11-18T12:00:00Z',
                    },
                  ]}
                  activeConversationId={1}
                  onSelectConversation={() => {}}
                  onNewConversation={() => {}}
                  onDeleteConversation={() => {}}
                />
              </MemoryRouter>
            </CompareProvider>
          </AuthContext.Provider>
        </QueryClientProvider>,
      );

      // Advisor message stacks below sm so cards get full width on 320px
      const threadRow = container.firstElementChild as HTMLElement;
      expect(threadRow.className).toContain('flex-col');
      expect(threadRow.className).toContain('sm:flex-row');

      // Recommendation card footers wrap cleanly
      const footers = container.querySelectorAll('[data-slot="card-footer"]');
      expect(footers.length).toBeGreaterThan(0);
      footers.forEach((footer) => {
        expect(footer.className).toContain('flex-wrap');
      });

      // Conversation delete button is visible on mobile touchscreens
      const deleteBtn = screen.getByRole('button', {
        name: /delete conversation: laptop under 90k/i,
      });
      expect(deleteBtn.className).toContain('opacity-100');
      expect(deleteBtn.className).toContain('md:opacity-0');
    });
  });

  describe('Admin tables collapse to stacked rows below md', () => {
    it('collapses AdminAiLogsTable and AdminAiTopUsersCard below md with mobile field labels', () => {
      render(
        <>
          <AdminAiLogsTable
            logs={[
              {
                id: 10,
                feature: 'assistant',
                model: 'llama-3.3-70b',
                prompt_tokens: 400,
                completion_tokens: 180,
                total_tokens: 580,
                latency_ms: 620,
                status: 'ok',
                error_code: null,
                created_at: '2026-11-18T12:00:00Z',
                user: {
                  id: 2,
                  name: 'Priya Patel',
                  email: 'priya@example.com',
                },
              },
            ]}
            pagination={{
              current_page: 1,
              last_page: 1,
              per_page: 20,
              total: 1,
            }}
            onPageChange={() => {}}
          />
          <AdminAiTopUsersCard
            topUsers={[
              {
                user_id: 2,
                name: 'Priya Patel',
                email: 'priya@example.com',
                total_calls: 12,
                total_tokens: 8400,
                last_active_at: '2026-11-18T12:00:00Z',
              },
            ]}
            guestCalls={4}
          />
        </>,
      );

      const tables = screen.getAllByRole('table');
      expect(tables).toHaveLength(2);
      for (const table of tables) {
        expect(table.className).toContain('block');
        expect(table.className).toContain('md:table');

        const thead = table.querySelector('thead');
        expect(thead?.className).toContain('hidden');
        expect(thead?.className).toContain('md:table-header-group');

        const mobileLabels = table.querySelectorAll('tbody .md\\:hidden');
        expect(mobileLabels.length).toBeGreaterThan(0);
      }
    });
  });
});
