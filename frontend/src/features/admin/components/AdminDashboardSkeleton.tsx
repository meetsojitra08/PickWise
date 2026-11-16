import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminDashboardSkeleton() {
  return (
    <div data-testid="admin-dashboard-skeleton" className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border border-border bg-card p-4">
            <div className="flex items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-8 rounded-control" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-2 h-3.5 w-36" />
          </Card>
        ))}
      </div>

      <Card className="border border-border bg-card p-4">
        <div className="flex items-center justify-between pb-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-control" />
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, colIndex) => (
          <Card key={colIndex} className="border border-border bg-card p-4">
            <div className="flex items-center justify-between pb-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, rowIndex) => (
                <Skeleton
                  key={rowIndex}
                  className="h-14 w-full rounded-control"
                />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
