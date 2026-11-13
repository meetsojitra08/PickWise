import { Skeleton } from '@/components/ui/skeleton';

export function CompareMatrixSkeleton() {
  return (
    <div role="status" aria-label="Loading comparison" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-card">
        <div className="grid grid-cols-3 gap-4 border-b border-border p-4 sm:p-5">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>

        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-3 gap-4 border-t border-border p-4 first:border-t-0 sm:p-5"
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
