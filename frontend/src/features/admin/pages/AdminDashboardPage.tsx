import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminDashboard } from '../api/admin-api';
import { AdminAiSummaryCard } from '../components/AdminAiSummaryCard';
import { AdminDashboardSkeleton } from '../components/AdminDashboardSkeleton';
import { AdminKpiTiles } from '../components/AdminKpiTiles';
import { AdminPendingReviewsCard } from '../components/AdminPendingReviewsCard';
import { AdminRecentActivityCard } from '../components/AdminRecentActivityCard';

export function AdminDashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminDashboard();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Admin overview
          </h1>
          <p className="text-sm text-muted-foreground">
            System-wide telemetry across catalog, accounts, moderation, and AI
            runtimes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isLoading || isFetching}
            className="gap-2"
          >
            <RefreshCw
              className={`size-4 ${isFetching ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <AdminDashboardSkeleton />
      ) : isError ? (
        <div
          data-testid="admin-dashboard-error"
          className="flex flex-col items-center justify-center rounded-surface border border-destructive/30 bg-destructive/5 p-8 text-center"
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle
              className="size-6"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Unable to load dashboard data
          </h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : 'An unexpected error occurred while fetching system metrics.'}
          </p>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => void refetch()}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      ) : data ? (
        <div className="space-y-6">
          <AdminKpiTiles counts={data.counts} aiUsage={data.ai_usage_today} />

          <AdminAiSummaryCard aiUsage={data.ai_usage_today} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AdminPendingReviewsCard
              reviews={data.pending_reviews}
              pendingCount={data.counts.pending_reviews}
            />
            <AdminRecentActivityCard activities={data.recent_activity} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
