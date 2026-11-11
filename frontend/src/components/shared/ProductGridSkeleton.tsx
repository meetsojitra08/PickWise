import { ProductCardSkeleton } from '@/components/shared/ProductCardSkeleton';
import { cn } from '@/lib/utils';

export interface ProductGridSkeletonProps {
  count?: number;
  showSummary?: boolean;
  showActions?: boolean;
  label?: string;
  className?: string;
}

export function ProductGridSkeleton({
  count = 8,
  showSummary = true,
  showActions = false,
  label = 'Loading products',
  className,
}: ProductGridSkeletonProps) {
  const safeCount = Math.max(0, Math.floor(count));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className,
      )}
    >
      <span className="sr-only">{label}</span>

      {Array.from({ length: safeCount }, (_, index) => (
        <ProductCardSkeleton
          key={index}
          showSummary={showSummary}
          showActions={showActions}
        />
      ))}
    </div>
  );
}
