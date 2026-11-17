import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle,
  Clock,
  Coins,
  Filter,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAdminAiUsage } from '../api/admin-api';
import { AdminAiByFeatureCard } from '../components/AdminAiByFeatureCard';
import { AdminAiLogsTable } from '../components/AdminAiLogsTable';
import { AdminAiTopUsersCard } from '../components/AdminAiTopUsersCard';
import { AdminAiUsageChart } from '../components/AdminAiUsageChart';
import type { AdminAiUsageFilters } from '../types';

function formatDateInput(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getDefaultDateRange(days: number): {
  start_date: string;
  end_date: string;
} {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return {
    start_date: formatDateInput(start),
    end_date: formatDateInput(end),
  };
}

export function AdminAiUsagePage() {
  const [activePreset, setActivePreset] = useState<number | 'custom'>(30);
  const [filters, setFilters] = useState<AdminAiUsageFilters>(() => ({
    ...getDefaultDateRange(30),
    feature: 'all',
    status: 'all',
    page: 1,
    per_page: 20,
  }));

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminAiUsage(filters);

  function handlePresetChange(days: number) {
    setActivePreset(days);
    const range = getDefaultDateRange(days);
    setFilters((prev) => ({
      ...prev,
      start_date: range.start_date,
      end_date: range.end_date,
      page: 1,
    }));
  }

  function handleStartDateChange(value: string) {
    setActivePreset('custom');
    setFilters((prev) => ({
      ...prev,
      start_date: value || undefined,
      page: 1,
    }));
  }

  function handleEndDateChange(value: string) {
    setActivePreset('custom');
    setFilters((prev) => ({
      ...prev,
      end_date: value || undefined,
      page: 1,
    }));
  }

  function handleFeatureChange(value: AdminAiUsageFilters['feature']) {
    setFilters((prev) => ({
      ...prev,
      feature: value,
      page: 1,
    }));
  }

  function handleStatusChange(value: AdminAiUsageFilters['status']) {
    setFilters((prev) => ({
      ...prev,
      status: value,
      page: 1,
    }));
  }

  function handlePageChange(newPage: number) {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  }

  function handleResetFilters() {
    setActivePreset(30);
    setFilters({
      ...getDefaultDateRange(30),
      feature: 'all',
      status: 'all',
      page: 1,
      per_page: 20,
    });
  }

  return (
    <div className="space-y-6" data-testid="admin-ai-usage-page">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            AI usage & telemetry
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor model execution, tokens, error rates, and per-user
            consumption across the platform.
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
            data-testid="refresh-ai-usage-button"
          >
            <RefreshCw
              className={`size-4 ${isFetching ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        className="flex flex-col gap-4 rounded-card border border-border bg-card p-4 shadow-card lg:flex-row lg:items-center lg:justify-between"
        data-testid="ai-filter-toolbar"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-1">
            <Calendar className="size-3.5" aria-hidden="true" />
            Window:
          </span>

          {[
            { label: '7D', days: 7 },
            { label: '14D', days: 14 },
            { label: '30D', days: 30 },
            { label: '90D', days: 90 },
          ].map((preset) => (
            <Button
              key={preset.days}
              type="button"
              variant={activePreset === preset.days ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetChange(preset.days)}
              className="h-8 px-2.5 text-xs"
              data-testid={`preset-${preset.days}d`}
            >
              {preset.label}
            </Button>
          ))}

          {/* Custom Date Inputs */}
          <div className="flex items-center gap-1.5 ml-1 text-xs">
            <input
              type="date"
              value={filters.start_date ?? ''}
              onChange={(e) => handleStartDateChange(e.target.value)}
              aria-label="Start date"
              className="h-8 rounded-control border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              data-testid="start-date-input"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={filters.end_date ?? ''}
              onChange={(e) => handleEndDateChange(e.target.value)}
              aria-label="End date"
              className="h-8 rounded-control border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              data-testid="end-date-input"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Feature selector */}
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Bot className="size-3.5" aria-hidden="true" />
              Feature:
            </span>
            <select
              value={filters.feature ?? 'all'}
              onChange={(e) =>
                handleFeatureChange(
                  e.target.value as AdminAiUsageFilters['feature'],
                )
              }
              aria-label="Filter by feature"
              className="h-8 rounded-control border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              data-testid="feature-select"
            >
              <option value="all">All features</option>
              <option value="assistant">Shopping Assistant</option>
              <option value="compare">Compare Verdict</option>
              <option value="review_summary">Review Summary</option>
            </select>
          </div>

          {/* Status selector */}
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Filter className="size-3.5" aria-hidden="true" />
              Status:
            </span>
            <select
              value={filters.status ?? 'all'}
              onChange={(e) =>
                handleStatusChange(
                  e.target.value as AdminAiUsageFilters['status'],
                )
              }
              aria-label="Filter by status"
              className="h-8 rounded-control border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              data-testid="status-select"
            >
              <option value="all">All statuses</option>
              <option value="ok">Successful (Ok)</option>
              <option value="error">Errors</option>
              <option value="rate_limited">Throttled (Limits)</option>
            </select>
          </div>

          {/* Reset button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            data-testid="reset-filters-button"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span>Reset</span>
          </Button>
        </div>
      </div>

      {/* Main Content States */}
      {isLoading ? (
        <div className="space-y-6" data-testid="ai-usage-skeleton">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-card border border-border bg-muted/60"
              />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-card border border-border bg-muted/60" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-card border border-border bg-muted/60" />
            <div className="h-64 animate-pulse rounded-card border border-border bg-muted/60" />
          </div>
          <div className="h-64 animate-pulse rounded-card border border-border bg-muted/60" />
        </div>
      ) : isError ? (
        <div
          data-testid="admin-ai-error"
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
            Unable to load AI telemetry
          </h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : 'An unexpected error occurred while fetching AI usage logs.'}
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
          {/* KPI Tiles */}
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            data-testid="ai-kpi-grid"
          >
            {/* Total Calls */}
            <Card className="rounded-card border-border shadow-card">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total AI calls
                  </span>
                  <div className="flex size-8 items-center justify-center rounded-control bg-primary/10 text-primary">
                    <Activity
                      className="size-4"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span
                    className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
                    data-testid="kpi-total-calls"
                  >
                    {data.summary.total_calls.toLocaleString('en-US')}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.summary.successful_calls.toLocaleString('en-US')}{' '}
                  success · {data.summary.failed_calls} failed
                </p>
              </CardContent>
            </Card>

            {/* Success Reliability */}
            <Card className="rounded-card border-border shadow-card">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Success reliability
                  </span>
                  <div className="flex size-8 items-center justify-center rounded-control bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <CheckCircle
                      className="size-4"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span
                    className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
                    data-testid="kpi-success-rate"
                  >
                    {data.summary.total_calls > 0
                      ? `${(100 - data.summary.error_rate).toFixed(1)}%`
                      : '100%'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.summary.error_rate}% error rate (
                  {data.summary.error_calls} err,{' '}
                  {data.summary.rate_limited_calls} lim)
                </p>
              </CardContent>
            </Card>

            {/* Total Tokens */}
            <Card className="rounded-card border-border shadow-card">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total tokens
                  </span>
                  <div className="flex size-8 items-center justify-center rounded-control bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                    <Coins
                      className="size-4"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span
                    className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
                    data-testid="kpi-total-tokens"
                  >
                    {data.summary.total_tokens.toLocaleString('en-US')}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground font-mono">
                  {data.summary.prompt_tokens.toLocaleString('en-US')} prompt ·{' '}
                  {data.summary.completion_tokens.toLocaleString('en-US')} out
                </p>
              </CardContent>
            </Card>

            {/* Avg Response Time */}
            <Card className="rounded-card border-border shadow-card">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Average latency
                  </span>
                  <div className="flex size-8 items-center justify-center rounded-control bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
                    <Clock
                      className="size-4"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span
                    className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
                    data-testid="kpi-avg-latency"
                  >
                    {data.summary.avg_latency_ms}{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                      ms
                    </span>
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Across all successful model queries
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Usage Chart */}
          <AdminAiUsageChart data={data.daily_usage} />

          {/* Feature Breakdown & Top Users 2-Column Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AdminAiByFeatureCard features={data.by_feature} />
            <AdminAiTopUsersCard
              topUsers={data.top_users}
              guestCalls={data.guest_calls}
            />
          </div>

          {/* Granular Logs Table */}
          <AdminAiLogsTable
            logs={data.logs}
            pagination={data.pagination}
            onPageChange={handlePageChange}
            isLoading={isFetching}
          />
        </div>
      ) : null}
    </div>
  );
}
