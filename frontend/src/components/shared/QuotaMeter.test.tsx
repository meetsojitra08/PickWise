import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuotaMeter } from './QuotaMeter';

describe('QuotaMeter', () => {
  it('renders remaining count when quota is available', () => {
    render(
      <QuotaMeter
        quota={{
          limit: 30,
          used: 12,
          remaining: 18,
          resets_at: '2026-11-15T00:00:00Z',
        }}
      />,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('AI answers left today')).toBeInTheDocument();
  });

  it('handles singular answer wording', () => {
    render(
      <QuotaMeter
        quota={{
          limit: 30,
          used: 29,
          remaining: 1,
          resets_at: '2026-11-15T00:00:00Z',
        }}
      />,
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('AI answer left today')).toBeInTheDocument();
  });

  it('renders exhausted state with 0 remaining', () => {
    render(
      <QuotaMeter
        quota={{
          limit: 30,
          used: 30,
          remaining: 0,
          resets_at: '2026-11-15T00:00:00Z',
        }}
      />,
    );

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('AI answers left today')).toBeInTheDocument();
  });
});
