import { cva, type VariantProps } from 'class-variance-authority';
import { TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { calculatePriceDropPercent, formatPrice } from '@/lib/format-price';
import { cn } from '@/lib/utils';
import type { MoneyValue } from '@/types/api';

const priceTextVariants = cva(
  'font-heading font-semibold tracking-tight text-foreground tabular-nums',
  {
    variants: {
      size: {
        sm: 'text-base',
        default: 'text-lg',
        lg: 'text-2xl sm:text-3xl',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

const previousPriceVariants = cva(
  'text-muted-foreground line-through tabular-nums',
  {
    variants: {
      size: {
        sm: 'text-xs',
        default: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

export interface PriceTagProps extends VariantProps<typeof priceTextVariants> {
  price: MoneyValue;
  previousPrice?: MoneyValue | null;
  priceDropPercent?: number | null;
  className?: string;
}

export function PriceTag({
  price,
  previousPrice = null,
  priceDropPercent = null,
  size = 'default',
  className,
}: PriceTagProps) {
  const computedDrop =
    previousPrice !== null
      ? calculatePriceDropPercent(price, previousPrice)
      : null;

  const hasValidPrevious = previousPrice !== null && computedDrop !== null;
  const resolvedDropPercent =
    priceDropPercent !== null && priceDropPercent >= 1
      ? Math.round(priceDropPercent)
      : computedDrop;

  return (
    <div
      className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-1', className)}
    >
      <span className={priceTextVariants({ size })}>{formatPrice(price)}</span>

      {hasValidPrevious && previousPrice !== null ? (
        <span className={previousPriceVariants({ size })}>
          <span className="sr-only">Original price </span>
          {formatPrice(previousPrice)}
        </span>
      ) : null}

      {resolvedDropPercent !== null ? (
        <Badge variant="positive" className="self-center tabular-nums">
          <TrendingDown
            className="size-3"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <span>{resolvedDropPercent}% drop</span>
        </Badge>
      ) : null}
    </div>
  );
}
