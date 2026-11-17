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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-muted-foreground">
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
              <tbody className="divide-y divide-border/50">
                {topUsers.map((user, idx) => (
                  <tr
                    key={user.user_id}
                    className="transition-colors hover:bg-muted/30"
                    data-testid={`top-user-row-${user.user_id}`}
                  >
                    <td className="py-2.5 pr-2">
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
                    <td className="py-2.5 text-right font-semibold text-foreground">
                      {user.total_calls.toLocaleString('en-US')}
                    </td>
                    <td className="py-2.5 text-right font-mono text-muted-foreground">
                      {user.total_tokens.toLocaleString('en-US')}
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">
                      {formatLastActive(user.last_active_at)}
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
