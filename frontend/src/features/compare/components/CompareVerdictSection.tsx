import { useEffect } from 'react';
import {
  VerdictPanel,
  type VerdictData,
} from '@/components/shared/VerdictPanel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCompareVerdict,
  type CompareVerdictPayload,
} from '@/features/compare/hooks/use-compare-verdict';
import type { SavedComparisonVerdict } from '@/features/compare/types/saved-comparison';
import { cn } from '@/lib/utils';

export interface CompareVerdictSectionProps {
  productIds: number[];
  initialVerdict?: CompareVerdictPayload | null;
  comparisonId?: number | null;
  onVerdictChange?: (verdict: SavedComparisonVerdict | null) => void;
  className?: string;
}

export function CompareVerdictSection({
  productIds,
  initialVerdict,
  comparisonId,
  onVerdictChange,
  className,
}: CompareVerdictSectionProps) {
  const {
    status,
    verdictData,
    priority,
    setPriority,
    errorMessage,
    generate,
    retry,
    quota,
  } = useCompareVerdict({
    productIds,
    initialVerdict,
    comparisonId,
  });

  useEffect(() => {
    if (!onVerdictChange) return;
    if (verdictData) {
      onVerdictChange({
        verdict: verdictData.verdict,
        products: verdictData.products,
        generated_at:
          'generated_at' in verdictData && verdictData.generated_at
            ? verdictData.generated_at
            : new Date().toISOString(),
      });
    } else {
      onVerdictChange(null);
    }
  }, [verdictData, onVerdictChange]);

  const formattedData: VerdictData | undefined = verdictData
    ? {
        title: 'AI Verdict',
        headline: verdictData.verdict,
        products: verdictData.products.map((p) => ({
          id: p.product_id,
          name: p.name,
          strengths: p.strengths,
          weaknesses: p.weaknesses,
        })),
      }
    : undefined;

  const quotaNote = quota
    ? `${quota.remaining} of ${quota.limit} AI uses remaining today`
    : undefined;

  const priorityInput = (
    <div className="flex flex-col gap-1.5 max-w-md w-full">
      <Label
        htmlFor="compare-verdict-priority"
        className="text-xs font-medium text-muted-foreground"
      >
        What matters most to you? (optional)
      </Label>
      <Input
        id="compare-verdict-priority"
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        placeholder="e.g. Battery life, best value, portability"
        maxLength={100}
        className="h-11 bg-background/80 text-sm sm:h-9 sm:text-xs"
        disabled={status === 'loading'}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            generate();
          }
        }}
      />
    </div>
  );

  return (
    <section
      aria-label="AI Comparison Verdict"
      className={cn('mb-8', className)}
    >
      <VerdictPanel
        status={status}
        data={formattedData}
        title="AI Verdict"
        headline={verdictData?.verdict}
        generateLabel="Get AI verdict"
        idleTitle="Get an AI verdict on this comparison"
        idleDescription="Analyze key differences, strengths, and trade-offs to see which product best fits your priorities."
        sourceNote={quotaNote}
        errorMessage={errorMessage ?? undefined}
        onGenerate={() => generate()}
        onRegenerate={() => generate()}
        onRetry={retry}
        actions={
          status === 'idle' ? (
            priorityInput
          ) : status === 'ready' ? (
            <div className="flex w-full items-center gap-2 sm:w-auto sm:max-w-xs">
              <Input
                aria-label="Adjust comparison priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                placeholder="Adjust priority (e.g. battery)"
                maxLength={100}
                className="h-10 bg-background/80 text-sm sm:h-8 sm:text-xs"
              />
            </div>
          ) : null
        }
      />
    </section>
  );
}
