import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminActivityItem } from '../types';

export interface AdminRecentActivityCardProps {
  activities: AdminActivityItem[];
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return dateString;
    }
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
      return 'just now';
    }
    if (diffMin < 60) {
      return `${diffMin}m ago`;
    }
    if (diffHour < 24) {
      return `${diffHour}h ago`;
    }
    if (diffDay < 7) {
      return `${diffDay}d ago`;
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function getActionBadgeStyle(action: string): string {
  if (action.includes('created') || action.includes('approved')) {
    return 'bg-positive/10 text-positive border-positive/20';
  }
  if (
    action.includes('deleted') ||
    action.includes('rejected') ||
    action.includes('deactivated')
  ) {
    return 'bg-negative/10 text-negative border-negative/20';
  }
  return 'bg-primary/10 text-primary border-primary/20';
}

export function AdminRecentActivityCard({
  activities,
}: AdminRecentActivityCardProps) {
  return (
    <Card className="flex h-full flex-col border border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-control bg-primary/10 text-primary">
            <ShieldCheck
              className="size-4"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Recent Admin Activity
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Append-only audit trail of system modifications
            </p>
          </div>
        </div>

        <Link
          to="/admin/activity-logs"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          View audit log
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pt-0">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-control border border-dashed border-border py-8 text-center">
            <ShieldCheck
              className="size-8 text-muted-foreground/50"
              aria-hidden="true"
            />
            <p className="mt-2 text-sm font-medium text-foreground">
              No audit logs recorded yet
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Administrative writes across the catalog and accounts will appear
              here.
            </p>
          </div>
        ) : (
          <ul
            data-testid="admin-recent-activity-list"
            className="divide-y divide-border/60"
          >
            {activities.map((activity) => (
              <li
                key={activity.id}
                className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-control border px-1.5 py-0.5 text-[11px] font-medium font-mono ${getActionBadgeStyle(
                        activity.action,
                      )}`}
                    >
                      {activity.action}
                    </span>
                    {activity.subject_type ? (
                      <span className="text-xs text-muted-foreground">
                        on {activity.subject_type.split('\\').pop()} #
                        {activity.subject_id}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    by{' '}
                    <span className="font-medium text-foreground">
                      {activity.admin?.name ?? 'Admin'}
                    </span>{' '}
                    {activity.ip_address ? (
                      <span className="text-[11px] text-muted-foreground/80">
                        ({activity.ip_address})
                      </span>
                    ) : null}
                  </div>
                </div>

                <time
                  dateTime={activity.created_at}
                  className="shrink-0 text-xs text-muted-foreground tabular-nums whitespace-nowrap"
                >
                  {formatRelativeTime(activity.created_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
