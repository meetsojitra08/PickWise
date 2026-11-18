/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminLayout } from '@/app/layouts/AdminLayout';
import { AppLayout } from '@/app/layouts/AppLayout';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { ThemeProvider } from '@/app/ThemeProvider';
import { PickwiseLogo } from '@/components/shared/PickwiseLogo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { AdminAiSummaryCard } from '@/features/admin/components/AdminAiSummaryCard';
import { AdminKpiTiles } from '@/features/admin/components/AdminKpiTiles';
import { AdminPendingReviewsCard } from '@/features/admin/components/AdminPendingReviewsCard';
import { AssistantThreadMessage } from '@/features/assistant/components/AssistantThreadMessage';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { CompareProvider } from '@/features/compare/components/CompareProvider';

const GLOBALS_CSS = readFileSync(
  resolve(process.cwd(), 'src/styles/globals.css'),
  'utf8',
);
const THEME_INIT_SCRIPT = readFileSync(
  resolve(process.cwd(), 'public/theme-init.js'),
  'utf8',
);

function parseCssBlockTokens(
  css: string,
  selector: string,
): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(
    new RegExp(`(?:^|[\\r\\n}])${escaped}\\s*\\{([^}]*)\\}`),
  );
  if (!match) {
    throw new Error(`Could not find CSS block for selector "${selector}"`);
  }

  const tokens: Record<string, string> = {};
  for (const tokenMatch of match[1].matchAll(
    /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi,
  )) {
    tokens[tokenMatch[1]] = tokenMatch[2].trim();
  }
  return tokens;
}

function hexToRelativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const linearize = (channel: number) =>
    channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);

  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(hexA: string, hexB: string): number {
  const l1 = hexToRelativeLuminance(hexA);
  const l2 = hexToRelativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function mockMatchMedia(prefersDark: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? prefersDark : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('Dark Mode Verification Audit (P8-S4)', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    mockMatchMedia(false);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
    vi.restoreAllMocks();
  });

  describe('CSS Dark Theme Design Tokens & WCAG AA Contrast', () => {
    const darkTokens = parseCssBlockTokens(GLOBALS_CSS, '.dark');
    const lightTokens = parseCssBlockTokens(GLOBALS_CSS, ':root');

    it('defines semantic overlay and native dark select rules in globals.css', () => {
      expect(lightTokens['--overlay']).toBeDefined();
      expect(darkTokens['--overlay']).toBeDefined();
      expect(GLOBALS_CSS).toContain('--color-overlay: var(--overlay);');
      expect(GLOBALS_CSS).toMatch(/html\.dark\s*\{\s*color-scheme:\s*dark;/);
      expect(GLOBALS_CSS).toMatch(
        /option,\s*optgroup\s*\{[\s\S]*background-color:\s*var\(--popover\);[\s\S]*color:\s*var\(--popover-foreground\);/,
      );
    });

    it('keeps dark verdict-surface distinct from dark card surface', () => {
      expect(darkTokens['--verdict-surface']).toBeDefined();
      expect(darkTokens['--verdict-surface']).not.toBe(darkTokens['--card']);
      expect(darkTokens['--verdict-surface']).not.toBe(
        darkTokens['--background'],
      );
    });

    it('meets WCAG 2.2 AA (>= 4.5:1) contrast for all dark mode text and semantic token pairs', () => {
      const pairs: Array<[string, string, number]> = [
        ['--foreground', '--background', 4.5],
        ['--foreground', '--card', 4.5],
        ['--foreground', '--verdict-surface', 4.5],
        ['--sidebar-foreground', '--sidebar', 4.5],
        ['--muted-foreground', '--background', 4.5],
        ['--muted-foreground', '--card', 4.5],
        ['--muted-foreground', '--verdict-surface', 4.5],
        ['--primary', '--background', 4.5],
        ['--primary', '--card', 4.5],
        ['--primary', '--verdict-surface', 4.5],
        ['--primary-foreground', '--primary', 4.5],
        ['--accent', '--background', 4.5],
        ['--accent', '--card', 4.5],
        ['--accent', '--verdict-surface', 4.5],
        ['--accent-foreground', '--accent', 4.5],
        ['--positive', '--background', 4.5],
        ['--positive', '--card', 4.5],
        ['--positive', '--positive-subtle', 4.5],
        ['--positive', '--verdict-surface', 4.5],
        ['--positive-foreground', '--positive', 4.5],
        ['--negative', '--background', 4.5],
        ['--negative', '--card', 4.5],
        ['--negative', '--negative-subtle', 4.5],
        ['--negative', '--verdict-surface', 4.5],
        ['--negative-foreground', '--negative', 4.5],
        ['--warning', '--background', 4.5],
        ['--warning', '--card', 4.5],
        ['--warning', '--warning-subtle', 4.5],
        ['--warning', '--verdict-surface', 4.5],
        ['--warning-foreground', '--warning', 4.5],
      ];

      for (const [fgToken, bgToken, minRatio] of pairs) {
        const fgHex = darkTokens[fgToken];
        const bgHex = darkTokens[bgToken];
        expect(fgHex, `missing ${fgToken}`).toMatch(/^#[0-9a-f]{6}$/i);
        expect(bgHex, `missing ${bgToken}`).toMatch(/^#[0-9a-f]{6}$/i);
        const ratio = contrastRatio(fgHex, bgHex);
        expect(
          ratio,
          `Dark mode contrast for ${fgToken} (${fgHex}) on ${bgToken} (${bgHex}) is ${ratio.toFixed(2)}:1 (expected >= ${minRatio}:1)`,
        ).toBeGreaterThanOrEqual(minRatio);
      }
    });
  });

  describe('Pre-hydration Theme Bootstrap (no FOUC)', () => {
    it('applies .dark immediately when localStorage stores dark', () => {
      window.localStorage.setItem('pickwise-theme', 'dark');
      mockMatchMedia(false);

      new Function(THEME_INIT_SCRIPT)();

      expect(document.documentElement).toHaveClass('dark');
    });

    it('respects stored light theme even when OS prefers dark', () => {
      document.documentElement.classList.add('dark');
      window.localStorage.setItem('pickwise-theme', 'light');
      mockMatchMedia(true);

      new Function(THEME_INIT_SCRIPT)();

      expect(document.documentElement).not.toHaveClass('dark');
    });

    it('falls back to prefers-color-scheme: dark when no preference is stored', () => {
      mockMatchMedia(true);

      new Function(THEME_INIT_SCRIPT)();

      expect(document.documentElement).toHaveClass('dark');
    });
  });

  describe('Theme Toggle Availability Across Layouts', () => {
    it.each([
      ['AppLayout', AppLayout],
      ['AuthLayout', AuthLayout],
      ['AdminLayout', AdminLayout],
    ])('toggles dark mode cleanly in %s', async (_name, Layout) => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <ThemeProvider>
            <AuthProvider>
              <CompareProvider>
                <MemoryRouter>
                  <Routes>
                    <Route element={<Layout />}>
                      <Route index element={<div>Screen content</div>} />
                    </Route>
                  </Routes>
                </MemoryRouter>
              </CompareProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>,
      );

      const toggle = screen.getByRole('button', {
        name: /switch to dark theme/i,
      });
      await user.click(toggle);

      expect(document.documentElement).toHaveClass('dark');
      expect(
        screen.getByRole('button', { name: /switch to light theme/i }),
      ).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Dark Mode Component Contrast & Overlay Regressions', () => {
    it('gives PickwiseLogo high-contrast dark mode icon classes on bg-primary', () => {
      document.documentElement.classList.add('dark');

      const { container } = render(
        <MemoryRouter>
          <PickwiseLogo />
        </MemoryRouter>,
      );

      const badge = container.querySelector('span[aria-hidden="true"]');
      expect(badge?.className).toContain('dark:text-primary-foreground');
      const innerDiamond = container.querySelectorAll('svg path')[1];
      expect(innerDiamond?.getAttribute('class')).toContain('dark:fill-accent');
    });

    it('uses bg-overlay instead of bg-foreground/30 for Dialog and Sheet scrims', () => {
      document.documentElement.classList.add('dark');

      render(
        <>
          <Dialog open>
            <DialogContent>
              <DialogTitle>Dark dialog</DialogTitle>
              <DialogDescription>Dialog description</DialogDescription>
            </DialogContent>
          </Dialog>
          <Sheet open>
            <SheetContent>
              <SheetTitle>Dark sheet</SheetTitle>
              <SheetDescription>Sheet description</SheetDescription>
            </SheetContent>
          </Sheet>
        </>,
      );

      const dialogOverlay = document.querySelector(
        '[data-slot="dialog-overlay"]',
      );
      const sheetOverlay = document.querySelector(
        '[data-slot="sheet-overlay"]',
      );

      expect(dialogOverlay?.className).toContain('bg-overlay');
      expect(dialogOverlay?.className).not.toContain('bg-foreground');
      expect(sheetOverlay?.className).toContain('bg-overlay');
      expect(sheetOverlay?.className).not.toContain('bg-foreground');
    });

    it('renders AssistantThreadMessage fallback notice with readable bg-warning-subtle and text-foreground', () => {
      document.documentElement.classList.add('dark');

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <AuthProvider>
            <CompareProvider>
              <MemoryRouter>
                <AssistantThreadMessage
                  message={{
                    id: 1,
                    role: 'assistant',
                    content: 'Catalog matches below.',
                    status: 'fallback',
                    recommendations: [],
                    alternatives: [],
                    created_at: '2026-11-18T12:00:00Z',
                  }}
                />
              </MemoryRouter>
            </CompareProvider>
          </AuthProvider>
        </QueryClientProvider>,
      );

      const notice = screen.getByRole('status');
      expect(notice.className).toContain('bg-warning-subtle');
      expect(notice.className).toContain('text-foreground');
      expect(notice.className).not.toContain('text-warning-foreground');
    });

    it('avoids dark-invisible text-accent-foreground on admin dashboard highlight cards', () => {
      document.documentElement.classList.add('dark');

      const { container } = render(
        <MemoryRouter>
          <AdminKpiTiles
            counts={{
              products: { total: 60, published: 58, unpublished: 2 },
              users: { total: 20, active: 19, customers: 18, admins: 2 },
              pending_reviews: 4,
              ai_calls_today: 12,
            }}
            aiUsage={{
              total_calls: 12,
              successful_calls: 12,
              failed_calls: 0,
              total_tokens: 4500,
              avg_latency_ms: 420,
            }}
          />
          <AdminAiSummaryCard
            aiUsage={{
              total_calls: 12,
              successful_calls: 12,
              failed_calls: 0,
              total_tokens: 4500,
              avg_latency_ms: 420,
            }}
          />
          <AdminPendingReviewsCard reviews={[]} pendingCount={4} />
        </MemoryRouter>,
      );

      expect(container.innerHTML).not.toContain('text-accent-foreground');
    });
  });
});
