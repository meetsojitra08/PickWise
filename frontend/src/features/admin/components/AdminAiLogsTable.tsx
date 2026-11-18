import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AdminAiUsageLogItem, AdminAiUsagePagination } from '../types';

interface AdminAiLogsTableProps {
  logs: AdminAiUsageLogItem[];
  pagination: AdminAiUsagePagination;
  onPageChange: (newPage: number) => void;
  isLoading?: boolean;
}

function formatLogTimestamp(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(d);
  } catch {
    return isoStr;
  }
}

export function AdminAiLogsTable({
  logs,
  pagination,
  onPageChange,
  isLoading,
}: AdminAiLogsTableProps) {
  const { current_page, last_page, total } = pagination;

  return (
    <div
      className="rounded-card border border-border bg-card p-5 shadow-card"
      data-testid="ai-logs-table-card"
    >
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Recent AI request logs
          </h2>
          <p className="text-xs text-muted-foreground">
            Granular invocation records, token breakdown, and provider execution
            latency.
          </p>
        </div>

        <div className="text-xs text-muted-foreground">
          Showing <strong>{logs.length}</strong> of <strong>{total}</strong>{' '}
          records
        </div>
      </div>

      <div className="mt-4">
        {logs.length === 0 ? (
          <div
            className="flex h-36 flex-col items-center justify-center rounded-control border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground"
            data-testid="ai-logs-empty"
          >
            No AI invocation logs match your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th scope="col" className="pb-2.5 font-medium">
                    Timestamp
                  </th>
                  <th scope="col" className="pb-2.5 font-medium">
                    User
                  </th>
                  <th scope="col" className="pb-2.5 font-medium">
                    Feature
                  </th>
                  <th scope="col" className="pb-2.5 font-medium">
                    Model
                  </th>
                  <th scope="col" className="pb-2.5 text-right font-medium">
                    Tokens
                  </th>
                  <th scope="col" className="pb-2.5 text-right font-medium">
                    Latency
                  </th>
                  <th scope="col" className="pb-2.5 text-right font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {logs.map((log) => {
                  return (
                    <tr
                      key={log.id}
                      className="transition-colors hover:bg-muted/30"
                      data-testid={`ai-log-row-${log.id}`}
                    >
                      {/* Timestamp */}
                      <td className="py-2.5 pr-2 whitespace-nowrap text-muted-foreground font-mono">
                        {formatLogTimestamp(log.created_at)}
                      </td>

                      {/* User */}
                      <td className="py-2.5 pr-2">
                        {log.user ? (
                          <div className="min-w-0 max-w-[160px]">
                            <div className="truncate font-semibold text-foreground">
                              {log.user.name}
                            </div>
                            <div className="truncate text-[11px] text-muted-foreground">
                              {log.user.email}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                            Guest
                          </span>
                        )}
                      </td>

                      {/* Feature */}
                      <td className="py-2.5 pr-2">
                        <span className="inline-flex items-center rounded-control bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                          {log.feature === 'assistant'
                            ? 'Assistant'
                            : log.feature === 'compare'
                              ? 'Compare'
                              : 'Review Summary'}
                        </span>
                      </td>

                      {/* Model */}
                      <td className="py-2.5 pr-2 text-muted-foreground font-mono">
                        {log.model ?? '—'}
                      </td>

                      {/* Tokens */}
                      <td className="py-2.5 pr-2 text-right">
                        <div className="font-semibold text-foreground font-mono">
                          {log.total_tokens > 0
                            ? log.total_tokens.toLocaleString('en-US')
                            : '—'}
                        </div>
                        {log.prompt_tokens !== null && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {log.prompt_tokens} in /{' '}
                            {log.completion_tokens ?? 0} out
                          </div>
                        )}
                      </td>

                      {/* Latency */}
                      <td className="py-2.5 pr-2 text-right font-mono">
                        {log.latency_ms !== null ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Clock className="size-3 text-muted-foreground/60" />
                            {log.latency_ms} ms
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 text-right whitespace-nowrap">
                        {log.status === 'ok' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-positive-subtle px-2 py-0.5 text-[11px] font-medium text-positive">
                            <CheckCircle2 className="size-3" />
                            Ok
                          </span>
                        ) : log.status === 'error' ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive"
                            title={log.error_code ?? 'Error'}
                          >
                            <AlertCircle className="size-3" />
                            {log.error_code ? log.error_code : 'Error'}
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-warning-subtle px-2 py-0.5 text-[11px] font-medium text-foreground dark:text-warning"
                            title="Rate limited (daily quota exceeded)"
                          >
                            <ShieldAlert className="size-3" />
                            Throttled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {last_page > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <div className="text-xs text-muted-foreground">
              Page <strong>{current_page}</strong> of{' '}
              <strong>{last_page}</strong>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPageChange(current_page - 1)}
                disabled={current_page <= 1 || isLoading}
                className="gap-1 text-xs"
              >
                <ChevronLeft className="size-3.5" />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPageChange(current_page + 1)}
                disabled={current_page >= last_page || isLoading}
                className="gap-1 text-xs"
              >
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
