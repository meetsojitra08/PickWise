import { Skeleton } from '@/components/ui/skeleton';

export function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 sm:py-12 md:pb-12">
      <Skeleton className="mb-6 h-5 w-28" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <div className="space-y-3">
          <Skeleton className="aspect-4/3 w-full rounded-surface" />
          <div className="flex gap-3">
            <Skeleton className="size-16 rounded-control" />
            <Skeleton className="size-16 rounded-control" />
            <Skeleton className="size-16 rounded-control" />
          </div>
        </div>
        <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full max-w-lg" />
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
      <Skeleton className="mt-12 h-44 w-full rounded-surface" />
    </div>
  );
}
