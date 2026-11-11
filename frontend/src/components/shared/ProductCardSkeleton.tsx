import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface ProductCardSkeletonProps {
  showSummary?: boolean;
  showActions?: boolean;
  className?: string;
}

export function ProductCardSkeleton({
  showSummary = true,
  showActions = false,
  className,
}: ProductCardSkeletonProps) {
  return (
    <Card
      size="sm"
      aria-hidden="true"
      data-slot="product-card-skeleton"
      className={cn('h-full justify-between', className)}
    >
      <div className="flex flex-col gap-3">
        <div className="px-4">
          <Skeleton className="aspect-4/3 w-full rounded-media" />
        </div>

        <CardContent className="gap-2">
          <div className="flex min-h-6 items-center justify-between gap-2">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-3/5" />
          </div>

          {showSummary ? (
            <div className="flex flex-col gap-1.5 pt-0.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : null}

          <div className="pt-0.5">
            <Skeleton className="h-4 w-32" />
          </div>
        </CardContent>
      </div>

      <CardFooter className="items-center justify-between gap-2 border-t border-border/70 pt-3">
        <Skeleton className="h-7 w-24" />

        {showActions ? (
          <div className="flex shrink-0 items-center gap-1">
            <Skeleton className="size-11 rounded-control" />
            <Skeleton className="size-11 rounded-control" />
          </div>
        ) : null}
      </CardFooter>
    </Card>
  );
}
