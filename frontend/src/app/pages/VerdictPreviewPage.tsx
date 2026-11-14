import { useState } from 'react';
import {
  type VerdictStatus,
  VerdictPanel,
} from '@/components/shared/VerdictPanel';
import { Button } from '@/components/ui/button';

export function VerdictPreviewPage() {
  const [status, setStatus] = useState<VerdictStatus>('ready');

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          VerdictPanel Component Preview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Interactive preview to verify all 6 states, FitMeter, multi-product
          compare breakdown, light/dark theme, and responsive layouts.
        </p>
      </div>

      {/* State Switcher Controls */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Select State:
        </span>
        {(
          [
            'ready',
            'idle',
            'loading',
            'fallback',
            'error',
            'quota_exceeded',
          ] as const
        ).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? 'default' : 'outline'}
            onClick={() => setStatus(s)}
            className="capitalize"
          >
            {s.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Main Single Product / Primary Verdict */}
      <div className="space-y-4">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Current State: <span className="text-primary capitalize">{status.replace('_', ' ')}</span>
        </h2>

        <VerdictPanel
          status={status}
          title="Verdict"
          headline="Best for video editing under ₹90,000"
          fitScore={87}
          whyItFits={[
            '32GB RAM handles 4K timelines without throttling',
            'Colour-accurate OLED display with 100% DCI-P3 coverage',
          ]}
          tradeoffs={[
            'Fans get loud under sustained heavy export loads',
          ]}
          sourceNote="Based on 214 verified reviews"
          onGenerate={() => setStatus('loading')}
          onRetry={() => setStatus('ready')}
          onRegenerate={() => setStatus('loading')}
          actions={<Button size="sm">View product</Button>}
        />
      </div>

      {/* Multi-Product Comparison Example (when in ready state) */}
      {status === 'ready' && (
        <div className="space-y-4 pt-6 border-t border-border">
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Multi-Product Compare Breakdown (Ready State)
            </h2>
            <p className="text-xs text-muted-foreground">
              Used when 2 to 4 products are compared side-by-side in Phase 5 Step 11.
            </p>
          </div>

          <VerdictPanel
            status="ready"
            title="Compare Verdict"
            headline="MacBook Air M3 takes battery & thermals; Dell XPS 14 wins for creative GPU acceleration."
            sourceNote="Compared on 12 hardware specifications"
            onRegenerate={() => setStatus('loading')}
            products={[
              {
                id: 1,
                name: 'Apple MacBook Air M3',
                fitScore: 92,
                highlight: 'Best overall portability & battery',
                strengths: [
                  'Silent fanless operation even under sustained load',
                  'Up to 18 hours real-world battery life',
                  'Lightweight aluminum chassis with excellent trackpad',
                ],
                weaknesses: [
                  'Limited to one external display natively',
                  'Non-upgradable unified memory and storage',
                ],
              },
              {
                id: 2,
                name: 'Dell XPS 14 (2024)',
                fitScore: 86,
                highlight: 'Best creative GPU performance',
                strengths: [
                  '3.2K 120Hz OLED touch display with deep contrast',
                  'Dedicated Nvidia RTX 4050 GPU for 3D/video render',
                  'Modern edge-to-edge glass touchpad',
                ],
                weaknesses: [
                  'Audible fan noise under heavy rendering tasks',
                  'Battery life decreases significantly under compute',
                ],
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
