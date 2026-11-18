import {
  ArrowUpRight,
  Bot,
  MessageSquareAlert,
  Package,
  Users,
} from 'lucide-react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AdminAiUsageSummary, AdminDashboardCounts } from '../types';

export interface AdminKpiTilesProps {
  counts: AdminDashboardCounts;
  aiUsage: AdminAiUsageSummary;
}

export function AdminKpiTiles({ counts, aiUsage }: AdminKpiTilesProps) {
  const hasPendingReviews = counts.pending_reviews > 0;

  const tiles = [
    {
      title: 'Total products',
      value: counts.products.total,
      subtitle: `${counts.products.published} published · ${counts.products.unpublished} draft`,
      to: '/admin/products',
      icon: Package,
      badgeText: 'Catalog',
      badgeClass: 'bg-primary/10 text-primary',
    },
    {
      title: 'Registered users',
      value: counts.users.total,
      subtitle: `${counts.users.active} active · ${counts.users.admins} admin${counts.users.admins === 1 ? '' : 's'}`,
      to: '/admin/users',
      icon: Users,
      badgeText: 'Accounts',
      badgeClass: 'bg-muted text-muted-foreground',
    },
    {
      title: 'Pending reviews',
      value: counts.pending_reviews,
      subtitle: hasPendingReviews
        ? 'Requires moderation'
        : 'Queue is all clear',
      to: '/admin/reviews',
      icon: MessageSquareAlert,
      badgeText: hasPendingReviews ? 'Action needed' : 'Clear',
      badgeClass: hasPendingReviews
        ? 'bg-accent/20 text-foreground dark:text-accent font-medium'
        : 'bg-muted text-muted-foreground',
      highlight: hasPendingReviews,
    },
    {
      title: 'AI calls today',
      value: counts.ai_calls_today,
      subtitle: `${aiUsage.total_tokens.toLocaleString()} tokens · ${aiUsage.avg_latency_ms}ms avg`,
      to: '/admin/ai',
      icon: Bot,
      badgeText: 'LLM runtime',
      badgeClass: 'bg-primary/10 text-primary',
    },
  ];

  return (
    <div
      data-testid="admin-kpi-tiles"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {tiles.map((tile) => {
        const Icon = tile.icon;

        return (
          <Link
            key={tile.title}
            to={tile.to}
            className="group block transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label={`${tile.title}: ${tile.value}`}
          >
            <Card
              className={cn(
                'h-full border border-border bg-card transition-colors hover:border-primary/40 hover:bg-muted/20',
                tile.highlight && 'border-accent/40 bg-accent/5',
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {tile.title}
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      'flex size-8 items-center justify-center rounded-control border border-border/60 bg-muted/50 text-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary',
                      tile.highlight &&
                        'border-accent/40 bg-accent/15 text-warning dark:text-accent',
                    )}
                  >
                    <Icon
                      className="size-4"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </div>
                  <ArrowUpRight
                    className="size-3.5 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                    aria-hidden="true"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 pt-0">
                <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                  {tile.value.toLocaleString()}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{tile.subtitle}</span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-control px-1.5 py-0.5 text-[11px]',
                      tile.badgeClass,
                    )}
                  >
                    {tile.badgeText}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
