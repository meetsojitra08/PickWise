import { useState } from 'react';
import { Check, Copy, FileCode2, ShieldAlert, Split } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AdminActivityItem } from '../types';

interface AdminAuditDiffDialogProps {
  activity: AdminActivityItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function formatDialogTimestamp(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(d);
  } catch {
    return isoStr;
  }
}

export function AdminAuditDiffDialog({
  activity,
  open,
  onOpenChange,
}: AdminAuditDiffDialogProps) {
  const [showRawJson, setShowRawJson] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!activity) {
    return null;
  }

  const changes = activity.changes ?? {};
  const beforeObj =
    typeof changes.before === 'object' && changes.before !== null
      ? (changes.before as Record<string, unknown>)
      : null;
  const afterObj =
    typeof changes.after === 'object' && changes.after !== null
      ? (changes.after as Record<string, unknown>)
      : null;

  const isUpdate = beforeObj !== null && afterObj !== null;
  const isCreate = beforeObj === null && afterObj !== null;
  const isDelete = beforeObj !== null && afterObj === null;

  // Gather keys for update diff
  const diffKeys = isUpdate
    ? Array.from(
        new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]),
      ).sort()
    : isCreate
      ? Object.keys(afterObj).sort()
      : isDelete
        ? Object.keys(beforeObj).sort()
        : [];

  const rawJsonString = JSON.stringify(activity, null, 2);

  async function handleCopyJson(): Promise<void> {
    try {
      await navigator.clipboard.writeText(rawJsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failures
    }
  }

  const subjectName = activity.subject_type
    ? activity.subject_type.split('\\').pop()
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-3xl overflow-y-auto sm:max-h-[85vh]"
        data-testid="audit-diff-dialog"
      >
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="font-mono text-xs font-semibold"
            >
              {activity.action}
            </Badge>
            {subjectName ? (
              <span className="text-xs text-muted-foreground">
                Target: <strong>{subjectName}</strong> #{activity.subject_id}
              </span>
            ) : null}
          </div>
          <DialogTitle className="text-lg font-semibold text-foreground">
            Audit Record #{activity.id}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Recorded at {formatDialogTimestamp(activity.created_at)} by{' '}
            <strong className="text-foreground">
              {activity.admin?.name ?? 'Unknown Admin'}
            </strong>{' '}
            ({activity.admin?.email ?? 'no email'}) from IP{' '}
            <span className="font-mono">
              {activity.ip_address ?? 'unknown'}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        {/* View mode toggle */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Split className="size-3.5" aria-hidden="true" />
            <span>
              {isUpdate
                ? `Field diff (${diffKeys.length} modified attributes)`
                : isCreate
                  ? `Initial creation (${diffKeys.length} attributes)`
                  : isDelete
                    ? `Pre-deletion snapshot (${diffKeys.length} attributes)`
                    : 'Changes summary'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowRawJson((prev) => !prev)}
              className="h-7 text-xs"
              data-testid="toggle-raw-json-btn"
            >
              <FileCode2 className="mr-1.5 size-3.5" aria-hidden="true" />
              {showRawJson ? 'Show Visual Diff' : 'View Raw JSON'}
            </Button>
            {showRawJson ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyJson}
                className="h-7 text-xs"
                data-testid="copy-raw-json-btn"
              >
                {copied ? (
                  <>
                    <Check
                      className="mr-1.5 size-3.5 text-positive"
                      aria-hidden="true"
                    />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 size-3.5" aria-hidden="true" />
                    Copy JSON
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-4 py-2">
          {showRawJson ? (
            <pre
              className="max-h-96 overflow-x-auto rounded-control bg-muted/60 p-4 font-mono text-xs text-foreground"
              data-testid="raw-json-viewer"
            >
              {rawJsonString}
            </pre>
          ) : diffKeys.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-control border border-dashed border-border py-8 text-center text-xs text-muted-foreground"
              data-testid="empty-diff-notice"
            >
              No attribute modifications or before/after diffs recorded for this
              entry.
            </div>
          ) : isUpdate ? (
            <div
              className="overflow-hidden rounded-control border border-border"
              data-testid="update-diff-table"
            >
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                  <tr>
                    <th scope="col" className="w-1/3 px-3 py-2 font-medium">
                      Attribute
                    </th>
                    <th scope="col" className="w-1/3 px-3 py-2 font-medium">
                      Before
                    </th>
                    <th scope="col" className="w-1/3 px-3 py-2 font-medium">
                      After
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {diffKeys.map((key) => {
                    const beforeVal = beforeObj?.[key];
                    const afterVal = afterObj?.[key];
                    return (
                      <tr key={key} className="align-top hover:bg-muted/20">
                        <td className="px-3 py-2 font-mono font-medium text-foreground">
                          {key}
                        </td>
                        <td className="bg-negative/5 px-3 py-2 font-mono text-negative">
                          {formatValue(beforeVal)}
                        </td>
                        <td className="bg-positive/5 px-3 py-2 font-mono text-positive font-medium">
                          {formatValue(afterVal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : isCreate ? (
            <div
              className="overflow-hidden rounded-control border border-border"
              data-testid="create-diff-table"
            >
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                  <tr>
                    <th scope="col" className="w-1/3 px-3 py-2 font-medium">
                      Created Attribute
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Assigned Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {diffKeys.map((key) => (
                    <tr key={key} className="align-top hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono font-medium text-foreground">
                        {key}
                      </td>
                      <td className="bg-positive/5 px-3 py-2 font-mono text-positive font-medium">
                        {formatValue(afterObj?.[key])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              className="overflow-hidden rounded-control border border-border"
              data-testid="delete-diff-table"
            >
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                  <tr>
                    <th scope="col" className="w-1/3 px-3 py-2 font-medium">
                      Deleted Attribute
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Value Prior to Deletion
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {diffKeys.map((key) => (
                    <tr key={key} className="align-top hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono font-medium text-foreground">
                        {key}
                      </td>
                      <td className="bg-negative/5 px-3 py-2 font-mono text-negative">
                        {formatValue(beforeObj?.[key])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Redaction Notice */}
          <div className="flex items-start gap-2 rounded-control border border-border/80 bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
            <ShieldAlert
              className="mt-0.5 size-3.5 shrink-0 text-warning"
              aria-hidden="true"
            />
            <span>
              Sensitive attributes (passwords, auth tokens, API secrets, and raw
              LLM prompts) are automatically sanitized and redacted before
              storage in the append-only audit log.
            </span>
          </div>
        </div>

        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
