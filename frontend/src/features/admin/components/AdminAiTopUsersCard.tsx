import { User as UserIcon, Users } from 'lucide-react';
import type { AdminAiTopUserItem } from '../types';

interface AdminAiTopUsersCardProps {
  topUsers: AdminAiTopUserItem[];
  guestCalls: number;
}

function formatLastActive(isoDateStr: string | null): string {
  if (!isoDateStr) return 'Never';
  try {
    const d = new Date(isoDateStr);
    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoDateStr;
  }
}

export function AdminAiTopUsersCard({
  topUsers,
  guestCalls,
}: AdminAiTopUsersCardProps) {
  return (
    <div
      className="rounded-card border border-border bg-card p-5 shadow-card"
      data-testid="ai-top-users-card"
    >
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Top consumers
          </h2>
          <p className="text-xs text-muted-foreground">
            Accounts with highest request frequency to identify potential abuse.
          </p>
        </div>

        {/* Guest Calls badge */}
        <div
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground"
          data-testid="guest-calls-badge"
        >
          <Users
            className="size-3.5 text-muted-foreground"
            aria-hidden="true"
          />
          <span>
            Guest calls: <strong>{guestCalls.toLocaleString('en-US')}</strong>
          </span>
        </div>
      </div>

      <div className="mt-4">
        {topUsers.length === 0 ? (
          <div
            className="flex h-44 flex-col items-center justify-center rounded-control border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground"
            data-testid="top-users-empty"
          >
            <UserIcon
              className="mb-2 size-6 text-muted-foreground/60"
              aria-hidden="true"
            />
            No registered customer usage recorded in this timeframe.
          </div>
        ) : (
          <div className="md:overflow-x-auto">
            <table className="block w-full text-left text-xs md:table">
              <caption className="sr-only">Top AI usage consumers</caption>
              <thead className="hidden border-b border-border text-muted-foreground md:table-header-group">
                <tr>
                  <th scope="col" className="pb-2.5 font-medium">
                    User
                  </th>
                  <th scope="col" className="pb-2.5 text-right font-medium">
                    Calls
                  </th>
                  <th scope="col" className="pb-2.5 text-right font-medium">
                    Tokens
                  </th>
                  <th scope="col" className="pb-2.5 text-right font-medium">
                    Last active
                  </th>
                </tr>
              </thead>
              <tbody className="block divide-y divide-border/50 md:table-row-group">
                {topUsers.map((user, idx) => (
                  <tr
                    key={user.user_id}
                    className="block space-y-2 py-3 transition-colors hover:bg-muted/30 md:table-row md:space-y-0 md:py-0"
                    data-testid={`top-user-row-${user.user_id}`}
                  >
                    <td className="block py-0 md:table-cell md:py-2.5 md:pr-2">
                      <div className="flex items-center gap-2">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-foreground">
                            {user.name}
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="flex items-center justify-between gap-2 py-0 text-right font-semibold text-foreground md:table-cell md:py-2.5">
                      <span className="font-normal text-muted-foreground md:hidden">
                        Calls
                      </span>
                      <span>{user.total_calls.toLocaleString('en-US')}</span>
                    </td>
                    <td className="flex items-center justify-between gap-2 py-0 text-right font-mono text-muted-foreground md:table-cell md:py-2.5">
                      <span className="font-sans font-normal md:hidden">
                        Tokens
                      </span>
                      <span>{user.total_tokens.toLocaleString('en-US')}</span>
                    </td>
                    <td className="flex items-center justify-between gap-2 py-0 text-right text-muted-foreground md:table-cell md:py-2.5">
                      <span className="md:hidden">Last active</span>
                      <span>{formatLastActive(user.last_active_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
