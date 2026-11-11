import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormStatusBannerProps {
  variant: 'success' | 'error';
  message: string | null;
}

export function FormStatusBanner({ variant, message }: FormStatusBannerProps) {
  if (!message) {
    return null;
  }

  const isSuccess = variant === 'success';

  return (
    <div
      role={isSuccess ? 'status' : 'alert'}
      aria-live={isSuccess ? 'polite' : undefined}
      className={cn(
        'flex items-start gap-2.5 rounded-control border px-3.5 py-3 text-sm',
        isSuccess
          ? 'border-positive/30 bg-positive-subtle text-positive'
          : 'border-negative/30 bg-negative-subtle text-negative',
      )}
    >
      {isSuccess ? (
        <CheckCircle2
          className="mt-0.5 size-4 shrink-0"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      ) : (
        <AlertCircle
          className="mt-0.5 size-4 shrink-0"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      )}
      <span>{message}</span>
    </div>
  );
}
