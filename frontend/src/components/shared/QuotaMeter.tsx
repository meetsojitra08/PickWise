import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AiQuota } from '@/features/assistant/types/assistant';
import { cn } from '@/lib/utils';

interface QuotaMeterProps {
  quota?: AiQuota | null;
  isLoading?: boolean;
  className?: string;
}

export function QuotaMeter({
  quota,
  isLoading = false,
  className,
}: QuotaMeterProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          'inline-flex h-7 w-36 animate-pulse items-center rounded-full bg-muted/60',
          className,
        )}
        aria-hidden="true"
      />
    );
  }

  if (!quota) {
    return null;
  }

  const isExhausted = quota.remaining <= 0;
  const isLow = !isExhausted && quota.remaining <= 3;
  const unitLabel = quota.remaining === 1 ? 'AI answer' : 'AI answers';

  return (
    <div
      className={cn('inline-flex items-center gap-1.5', className)}
      role="status"
      aria-label={`AI daily quota: ${quota.remaining} of ${quota.limit} remaining`}
    >
      <Badge
        variant={isExhausted ? 'negative' : isLow ? 'warning' : 'secondary'}
        className="font-normal text-xs"
      >
        <Sparkles className="mr-1 size-3 shrink-0" aria-hidden="true" />
        <span className="font-semibold tabular-nums">{quota.remaining}</span>
        <span className="ml-1">{unitLabel} left today</span>
      </Badge>
    </div>
  );
}
