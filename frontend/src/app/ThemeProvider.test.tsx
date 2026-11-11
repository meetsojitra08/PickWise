import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/app/ThemeProvider';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

function mockMatchMedia(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? matches : false,
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

describe('ThemeProvider and ThemeToggle', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    mockMatchMedia(false);
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

  it('defaults to light mode when nothing is stored and OS prefers light', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    expect(document.documentElement).not.toHaveClass('dark');
    const toggle = screen.getByRole('button', { name: 'Switch to dark theme' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('uses OS dark preference when no stored theme exists', () => {
    mockMatchMedia(true);

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    expect(document.documentElement).toHaveClass('dark');
    const toggle = screen.getByRole('button', {
      name: 'Switch to light theme',
    });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('prefers stored theme over OS preference and persists toggles', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('pickwise-theme', 'light');
    mockMatchMedia(true);

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    expect(document.documentElement).not.toHaveClass('dark');

    await user.click(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    );

    expect(document.documentElement).toHaveClass('dark');
    expect(window.localStorage.getItem('pickwise-theme')).toBe('dark');

    await user.click(
      screen.getByRole('button', { name: 'Switch to light theme' }),
    );

    expect(document.documentElement).not.toHaveClass('dark');
    expect(window.localStorage.getItem('pickwise-theme')).toBe('light');
  });
});
