import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Split,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminActivityLogs, useAdminUsers } from '../api/admin-api';
import { AdminAuditDiffDialog } from '../components/AdminAuditDiffDialog';
import type { AdminActivityItem, AdminActivityLogFilters } from '../types';

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

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function formatAbsoluteTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(d);
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

const COMMON_ACTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'product.created', label: 'product.created' },
  { value: 'product.updated', label: 'product.updated' },
  { value: 'product.deleted', label: 'product.deleted' },
  { value: 'category.created', label: 'category.created' },
  { value: 'category.updated', label: 'category.updated' },
  { value: 'category.deleted', label: 'category.deleted' },
  { value: 'brand.created', label: 'brand.created' },
  { value: 'brand.updated', label: 'brand.updated' },
  { value: 'brand.deleted', label: 'brand.deleted' },
  { value: 'user.updated', label: 'user.updated' },
  { value: 'review.moderated', label: 'review.moderated' },
  { value: 'review.bulk_moderated', label: 'review.bulk_moderated' },
  { value: 'review.deleted', label: 'review.deleted' },
  {
    value: 'product.summary_regenerated',
    label: 'product.summary_regenerated',
  },
] as const;

const SUBJECT_ENTITIES = [
  { value: 'all', label: 'All Entities' },
  { value: 'Product', label: 'Product' },
  { value: 'Category', label: 'Category' },
  { value: 'Brand', label: 'Brand' },
  { value: 'User', label: 'User' },
  { value: 'Review', label: 'Review' },
  { value: 'SpecDefinition', label: 'Spec Definition' },
  { value: 'ProductImage', label: 'Product Image' },
] as const;

export function AdminActivityLogsPage() {
  const [activePreset, setActivePreset] = useState<number | 'custom'>(30);
  const [startDate, setStartDate] = useState<string>(
    () => getDefaultDateRange(30).start_date,
  );
  const [endDate, setEndDate] = useState<string>(
    () => getDefaultDateRange(30).end_date,
  );
  const [search, setSearch] = useState<string>('');
  const [adminId, setAdminId] = useState<number | 'all'>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [subjectTypeFilter, setSubjectTypeFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(20);

  // Inspector dialog state
  const [selectedActivity, setSelectedActivity] =
    useState<AdminActivityItem | null>(null);

  // Fetch admin user list for admin dropdown
  const { data: adminUsersData } = useAdminUsers({
    role: 'admin',
    per_page: 50,
  });
  const adminUsers = adminUsersData?.data ?? [];

  // Date range validation
  const dateError = useMemo(() => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return 'End date cannot be earlier than start date.';
    }
    const diffDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays > 90) {
      return 'Date range may not exceed 90 days.';
    }
    return null;
  }, [startDate, endDate]);

  const filters: AdminActivityLogFilters = useMemo(() => {
    return {
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      admin_id: typeof adminId === 'number' ? adminId : undefined,
      action: actionFilter !== 'all' ? actionFilter : undefined,
      subject_type: subjectTypeFilter !== 'all' ? subjectTypeFilter : undefined,
      search: search.trim() ? search.trim() : undefined,
      page,
      per_page: perPage,
    };
  }, [
    startDate,
    endDate,
    adminId,
    actionFilter,
    subjectTypeFilter,
    search,
    page,
    perPage,
  ]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminActivityLogs(dateError ? undefined : filters);

  const logs = data?.data ?? [];
  const meta = data?.meta;

  function handlePresetChange(days: number) {
    setActivePreset(days);
    const range = getDefaultDateRange(days);
    setStartDate(range.start_date);
    setEndDate(range.end_date);
    setPage(1);
  }

  function handleStartDateChange(val: string) {
    setActivePreset('custom');
    setStartDate(val);
    setPage(1);
  }

  function handleEndDateChange(val: string) {
    setActivePreset('custom');
    setEndDate(val);
    setPage(1);
  }

  function handleResetFilters() {
    setActivePreset(30);
    const range = getDefaultDateRange(30);
    setStartDate(range.start_date);
    setEndDate(range.end_date);
    setSearch('');
    setAdminId('all');
    setActionFilter('all');
    setSubjectTypeFilter('all');
    setPage(1);
  }

  return (
    <div className="space-y-6" data-testid="admin-activity-logs-page">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif">
              Audit Log Viewer
            </h1>
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/10 text-xs font-medium text-primary"
            >
              Append-only
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Trustworthy, tamper-resistant trail of all administrative actions,
            resource modifications, and sanitized diffs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 gap-1.5"
            data-testid="refresh-logs-btn"
          >
            <RefreshCw
              className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isFetching ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="border border-border bg-card shadow-card">
        <CardContent className="space-y-4 p-4 sm:p-5">
          {/* Top Row: Date Presets & Custom Dates */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-muted-foreground">
                Window:
              </span>
              {[7, 14, 30, 90].map((days) => (
                <Button
                  key={days}
                  type="button"
                  variant={activePreset === days ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetChange(days)}
                  className="h-8 text-xs"
                  data-testid={`preset-${days}d`}
                >
                  {days}D
                </Button>
              ))}
              <Button
                type="button"
                variant={activePreset === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActivePreset('custom')}
                className="h-8 text-xs"
                data-testid="preset-custom"
              >
                Custom
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Calendar
                  className="size-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
                <label htmlFor="audit-start-date" className="sr-only">
                  Start Date
                </label>
                <Input
                  id="audit-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="h-8 w-36 text-xs"
                  data-testid="start-date-input"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <label htmlFor="audit-end-date" className="sr-only">
                  End Date
                </label>
                <Input
                  id="audit-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="h-8 w-36 text-xs"
                  data-testid="end-date-input"
                />
              </div>
            </div>
          </div>

          {dateError ? (
            <div
              className="flex items-center gap-2 rounded-control bg-negative/10 px-3 py-2 text-xs text-negative"
              data-testid="date-range-error"
            >
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              <span>{dateError}</span>
            </div>
          ) : null}

          {/* Bottom Row: Multi-axis Filters & Search */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            {/* Search */}
            <div className="relative sm:col-span-2">
              <Search
                className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder="Search action, admin, IP, or ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 pl-9 pr-8 text-xs"
                data-testid="search-logs-input"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </div>

            {/* Admin Filter */}
            <div>
              <label htmlFor="admin-select" className="sr-only">
                Filter by Administrator
              </label>
              <select
                id="admin-select"
                value={adminId}
                onChange={(e) => {
                  const val = e.target.value;
                  setAdminId(val === 'all' ? 'all' : Number(val));
                  setPage(1);
                }}
                className="h-9 w-full rounded-control border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                data-testid="admin-select"
              >
                <option value="all">All Administrators</option>
                {adminUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Entity Filter */}
            <div>
              <label htmlFor="entity-select" className="sr-only">
                Filter by Entity Type
              </label>
              <select
                id="entity-select"
                value={subjectTypeFilter}
                onChange={(e) => {
                  setSubjectTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-control border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                data-testid="entity-select"
              >
                {SUBJECT_ENTITIES.map((ent) => (
                  <option key={ent.value} value={ent.value}>
                    {ent.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <label htmlFor="action-select" className="sr-only">
                Filter by Action
              </label>
              <select
                id="action-select"
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-control border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                data-testid="action-select"
              >
                {COMMON_ACTIONS.map((act) => (
                  <option key={act.value} value={act.value}>
                    {act.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reset Filters Shortcut */}
          {search ||
          adminId !== 'all' ||
          actionFilter !== 'all' ||
          subjectTypeFilter !== 'all' ||
          activePreset !== 30 ? (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                Filters applied
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                data-testid="reset-filters-btn"
              >
                <RotateCcw className="size-3" aria-hidden="true" />
                Reset filters
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Audit Log Table Card */}
      <Card className="border border-border bg-card shadow-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-5" data-testid="logs-loading-skeleton">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 py-2"
                >
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div
              className="flex flex-col items-center justify-center p-12 text-center"
              data-testid="logs-error-state"
            >
              <AlertTriangle
                className="size-10 text-negative/80"
                aria-hidden="true"
              />
              <h3 className="mt-3 text-base font-semibold text-foreground">
                Failed to load audit logs
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {(error as Error)?.message ||
                  'An error occurred while fetching administrative activity records.'}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="mt-4 h-8"
              >
                Try Again
              </Button>
            </div>
          ) : logs.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center p-12 text-center"
              data-testid="logs-empty-state"
            >
              <ShieldCheck
                className="size-10 text-muted-foreground/40"
                aria-hidden="true"
              />
              <h3 className="mt-3 text-base font-semibold text-foreground">
                No audit entries found
              </h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                No administrative writes matched your filter criteria within the
                selected window.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="mt-4 h-8"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="w-full text-left text-xs"
                data-testid="audit-logs-table"
              >
                <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Timestamp
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Administrator
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Action
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Subject
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      IP Address
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-medium"
                    >
                      Changes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {logs.map((item) => {
                    const subjectBasename = item.subject_type
                      ? item.subject_type.split('\\').pop()
                      : null;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-muted/30"
                        data-testid={`log-row-${item.id}`}
                      >
                        {/* Timestamp */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-foreground">
                            {formatRelativeTime(item.created_at)}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {formatAbsoluteTime(item.created_at)}
                          </div>
                        </td>

                        {/* Admin */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">
                            {item.admin?.name ?? 'System / Unknown'}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {item.admin?.email ?? 'no email'}
                          </div>
                        </td>

                        {/* Action Badge */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-control border px-2 py-0.5 text-xs font-mono font-medium ${getActionBadgeStyle(
                              item.action,
                            )}`}
                          >
                            {item.action}
                          </span>
                        </td>

                        {/* Subject */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {subjectBasename ? (
                            <span className="text-xs text-foreground">
                              <strong>{subjectBasename}</strong> #
                              {item.subject_id}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>

                        {/* IP Address */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-muted-foreground">
                          {item.ip_address ?? '—'}
                        </td>

                        {/* Changes / Inspect Action */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedActivity(item)}
                            className="h-7 gap-1 text-xs font-medium"
                            data-testid={`inspect-diff-btn-${item.id}`}
                          >
                            <Split className="size-3" aria-hidden="true" />
                            <span>View Diff</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {meta && meta.total > 0 ? (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
              <div className="text-xs text-muted-foreground">
                Showing{' '}
                <strong className="text-foreground">
                  {(meta.current_page - 1) * meta.per_page + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-foreground">
                  {Math.min(meta.current_page * meta.per_page, meta.total)}
                </strong>{' '}
                of <strong className="text-foreground">{meta.total}</strong>{' '}
                records
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-8 rounded-control border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  aria-label="Rows per page"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={meta.current_page <= 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </Button>
                  <span className="px-2 text-xs text-muted-foreground">
                    Page {meta.current_page} of {meta.last_page}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() =>
                      setPage((p) => Math.min(p + 1, meta.last_page))
                    }
                    disabled={meta.current_page >= meta.last_page}
                    aria-label="Next page"
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Diff Inspector Modal */}
      <AdminAuditDiffDialog
        activity={selectedActivity}
        open={selectedActivity !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedActivity(null);
        }}
      />
    </div>
  );
}
