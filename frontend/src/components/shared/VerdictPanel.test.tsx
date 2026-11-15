import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FitMeter, VerdictPanel } from './VerdictPanel';

describe('VerdictPanel', () => {
  describe('ready state', () => {
    it('renders signature verdict elements with fit meter, pros, cons, and source note', () => {
      render(
        <VerdictPanel
          status="ready"
          title="Verdict"
          headline="Best for video editing under ₹90,000"
          fitScore={87}
          whyItFits={[
            '32GB RAM handles 4K timelines',
            'Colour-accurate OLED display',
          ]}
          tradeoffs={['Fans get loud under sustained export']}
          sourceNote="Based on 214 reviews"
          actions={<button type="button">View product</button>}
        />,
      );

      // Section and heading
      expect(
        screen.getByRole('region', { name: /ai verdict/i }),
      ).toBeInTheDocument();
      expect(screen.getByText('Verdict')).toBeInTheDocument();
      expect(
        screen.getByText('Best for video editing under ₹90,000'),
      ).toBeInTheDocument();

      // Fit meter
      const meter = screen.getByRole('meter', { name: /fit: 87 out of 100/i });
      expect(meter).toBeInTheDocument();
      expect(meter).toHaveAttribute('aria-valuenow', '87');

      // Pros & Cons
      expect(screen.getByText('Why it fits')).toBeInTheDocument();
      expect(
        screen.getByText('32GB RAM handles 4K timelines'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Colour-accurate OLED display'),
      ).toBeInTheDocument();

      expect(screen.getByText('Trade-offs')).toBeInTheDocument();
      expect(
        screen.getByText('Fans get loud under sustained export'),
      ).toBeInTheDocument();

      // Actions and source note
      expect(
        screen.getByRole('button', { name: /view product/i }),
      ).toBeInTheDocument();
      expect(screen.getByText('Based on 214 reviews')).toBeInTheDocument();
    });

    it('renders with data object prop', () => {
      render(
        <VerdictPanel
          status="ready"
          data={{
            title: 'Top Recommendation',
            headline: 'Fastest overall workstation',
            verdict: 'Excellent performance for heavy multi-core workflows.',
            fitScore: 94,
            whyItFits: ['Exceptional cooling'],
            tradeoffs: ['Higher power consumption'],
            sourceNote: 'Compared on 12 benchmarks',
          }}
        />,
      );

      expect(screen.getByText('Top Recommendation')).toBeInTheDocument();
      expect(
        screen.getByText('Fastest overall workstation'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Excellent performance for heavy multi-core workflows.',
        ),
      ).toBeInTheDocument();
      expect(screen.getByText('Exceptional cooling')).toBeInTheDocument();
      expect(screen.getByText('Higher power consumption')).toBeInTheDocument();
      expect(screen.getByText('Compared on 12 benchmarks')).toBeInTheDocument();
    });

    it('renders multi-product comparison breakdown with strengths and weaknesses', () => {
      render(
        <VerdictPanel
          status="ready"
          title="Compare Verdict"
          headline="MacBook Air wins for portability, Dell XPS wins for display fidelity."
          sourceNote="Compared on 8 specs"
          products={[
            {
              id: 1,
              name: 'Apple MacBook Air M3',
              fitScore: 92,
              highlight: 'Best battery & thermals',
              strengths: ['Silent fanless operation', '18h battery life'],
              weaknesses: ['Limited external display support'],
            },
            {
              id: 2,
              name: 'Dell XPS 14',
              fitScore: 86,
              highlight: 'Best creative display',
              strengths: [
                '3.2K OLED 120Hz display',
                'Dedicated Nvidia graphics',
              ],
              weaknesses: ['Heavier chassis', 'Shorter battery life'],
            },
          ]}
        />,
      );

      expect(
        screen.getByText(
          'MacBook Air wins for portability, Dell XPS wins for display fidelity.',
        ),
      ).toBeInTheDocument();

      // Product 1
      expect(screen.getByText('Apple MacBook Air M3')).toBeInTheDocument();
      expect(screen.getByText('Best battery & thermals')).toBeInTheDocument();
      expect(screen.getByText('Silent fanless operation')).toBeInTheDocument();
      expect(
        screen.getByText('Limited external display support'),
      ).toBeInTheDocument();

      // Product 2
      expect(screen.getByText('Dell XPS 14')).toBeInTheDocument();
      expect(screen.getByText('Best creative display')).toBeInTheDocument();
      expect(screen.getByText('3.2K OLED 120Hz display')).toBeInTheDocument();
      expect(screen.getByText('Heavier chassis')).toBeInTheDocument();
    });

    it('triggers onRegenerate when the regenerate button is clicked', async () => {
      const user = userEvent.setup();
      const onRegenerate = vi.fn();

      render(
        <VerdictPanel
          status="ready"
          headline="Solid all-rounder"
          onRegenerate={onRegenerate}
        />,
      );

      const button = screen.getByRole('button', { name: /regenerate/i });
      expect(button).toBeInTheDocument();

      await user.click(button);
      expect(onRegenerate).toHaveBeenCalledTimes(1);
    });
  });

  describe('idle state', () => {
    it('renders idle prompt and calls onGenerate on button click', async () => {
      const user = userEvent.setup();
      const onGenerate = vi.fn();

      render(
        <VerdictPanel
          status="idle"
          idleTitle="Compare these 3 headphones"
          idleDescription="Get an AI summary comparing sound profile and battery life."
          generateLabel="Get AI verdict"
          onGenerate={onGenerate}
          sourceNote="3 products selected"
        />,
      );

      expect(
        screen.getByText('Compare these 3 headphones'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Get an AI summary comparing sound profile and battery life.',
        ),
      ).toBeInTheDocument();
      expect(screen.getByText('3 products selected')).toBeInTheDocument();

      const button = screen.getByRole('button', { name: /get ai verdict/i });
      await user.click(button);
      expect(onGenerate).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading state', () => {
    it('renders skeleton loading state with accessible status', () => {
      render(<VerdictPanel status="loading" />);

      const statusEl = screen.getByRole('status');
      expect(statusEl).toBeInTheDocument();
      expect(statusEl).toHaveAttribute('aria-busy', 'true');
      expect(
        screen.getByText(/analyzing products and generating ai verdict/i),
      ).toBeInTheDocument();
    });
  });

  describe('fallback state', () => {
    it('renders fallback notice and retry action', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();

      render(
        <VerdictPanel
          status="fallback"
          fallbackMessage="AI verdict is temporarily unavailable"
          sourceNote="Specs available"
          onRetry={onRetry}
        />,
      );

      expect(screen.getByText('Catalog fallback')).toBeInTheDocument();
      expect(
        screen.getByText('AI verdict is temporarily unavailable'),
      ).toBeInTheDocument();
      expect(screen.getByText('Specs available')).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /try again/i });
      await user.click(retryBtn);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('error state', () => {
    it('renders error alert and retry button', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();

      render(
        <VerdictPanel
          status="error"
          errorMessage="Failed to fetch comparison analysis"
          onRetry={onRetry}
        />,
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(screen.getByText('Verdict error')).toBeInTheDocument();
      expect(
        screen.getByText('Failed to fetch comparison analysis'),
      ).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /retry/i });
      await user.click(retryBtn);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('quota_exceeded state', () => {
    it('renders quota exhaustion notice', () => {
      render(
        <VerdictPanel
          status="quota_exceeded"
          quotaMessage="You have reached your 30 daily AI analyses limit."
        />,
      );

      expect(screen.getByText('Daily limit reached')).toBeInTheDocument();
      expect(screen.getByText('Daily AI quota reached')).toBeInTheDocument();
      expect(
        screen.getByText('You have reached your 30 daily AI analyses limit.'),
      ).toBeInTheDocument();
    });
  });

  describe('FitMeter', () => {
    it('clamps values below 0 and above 100', () => {
      const { rerender } = render(<FitMeter score={-15} label="Fit" />);
      let meter = screen.getByRole('meter');
      expect(meter).toHaveAttribute('aria-valuenow', '0');
      expect(screen.getByText('0')).toBeInTheDocument();

      rerender(<FitMeter score={140} label="Match" />);
      meter = screen.getByRole('meter');
      expect(meter).toHaveAttribute('aria-valuenow', '100');
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });
});
