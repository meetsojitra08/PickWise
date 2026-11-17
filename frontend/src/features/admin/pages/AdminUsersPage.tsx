import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { ApiError } from '@/lib/api-client';
import { updateAdminUser, useAdminUsers } from '../api/admin-api';
import type { AdminUser, AdminUserFilters } from '../types';

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'admin'>(
    'all',
  );
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [sort, setSort] = useState<string>('-created_at');
  const [page, setPage] = useState<number>(1);
  const perPage = 25;

  // Confirmation dialogs state
  const [statusDialogUser, setStatusDialogUser] = useState<AdminUser | null>(
    null,
  );
  const [roleDialogUser, setRoleDialogUser] = useState<AdminUser | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const filters: AdminUserFilters = useMemo(() => {
    return {
      search: search.trim() ? search.trim() : undefined,
      role: roleFilter === 'all' ? undefined : roleFilter,
      is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
      sort,
      page,
      per_page: perPage,
    };
  }, [search, roleFilter, statusFilter, sort, page]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminUsers(filters);

  const users = data?.data ?? [];
  const meta = data?.meta;

  function handleOpenStatusDialog(targetUser: AdminUser): void {
    setActionError(null);
    setStatusDialogUser(targetUser);
  }

  function handleOpenRoleDialog(targetUser: AdminUser): void {
    setActionError(null);
    setRoleDialogUser(targetUser);
  }

  async function handleConfirmStatusToggle(): Promise<void> {
    if (!statusDialogUser) return;
    setIsUpdating(true);
    setActionError(null);

    const newActive = !statusDialogUser.is_active;

    try {
      await updateAdminUser(statusDialogUser.id, { is_active: newActive });
      toast.success(
        newActive
          ? `User "${statusDialogUser.name}" has been activated.`
          : `User "${statusDialogUser.name}" has been deactivated.`,
      );
      setStatusDialogUser(null);
      await refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Failed to update user status. Please try again.');
      }
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleConfirmRoleChange(): Promise<void> {
    if (!roleDialogUser) return;
    setIsUpdating(true);
    setActionError(null);

    const newRole = roleDialogUser.role === 'admin' ? 'customer' : 'admin';

    try {
      await updateAdminUser(roleDialogUser.id, { role: newRole });
      toast.success(
        `Role for "${roleDialogUser.name}" changed to ${newRole === 'admin' ? 'Administrator' : 'Customer'}.`,
      );
      setRoleDialogUser(null);
      await refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Failed to update user role. Please try again.');
      }
    } finally {
      setIsUpdating(false);
    }
  }

  function handleResetFilters(): void {
    setSearch('');
    setRoleFilter('all');
    setStatusFilter('all');
    setSort('-created_at');
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            User Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage registered customer and administrator accounts, roles, and
            access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by name or email..."
                  className="pl-9 pr-9"
                  data-testid="admin-users-search"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="users-sort"
                  className="whitespace-nowrap text-xs font-medium text-muted-foreground"
                >
                  Sort by:
                </label>
                <select
                  id="users-sort"
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  data-testid="admin-users-sort"
                >
                  <option value="-created_at">Newest First</option>
                  <option value="created_at">Oldest First</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="-name">Name (Z-A)</option>
                  <option value="-reviews_count">Most Reviews</option>
                  <option value="reviews_count">Fewest Reviews</option>
                </select>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t">
              {/* Role Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Role:
                </span>
                <div className="flex rounded-md bg-muted p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setRoleFilter('all');
                      setPage(1);
                    }}
                    className={`rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
                      roleFilter === 'all'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRoleFilter('customer');
                      setPage(1);
                    }}
                    className={`rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
                      roleFilter === 'customer'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Customers
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRoleFilter('admin');
                      setPage(1);
                    }}
                    className={`rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
                      roleFilter === 'admin'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Admins
                  </button>
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status:
                </span>
                <div className="flex rounded-md bg-muted p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('all');
                      setPage(1);
                    }}
                    className={`rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
                      statusFilter === 'all'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('active');
                      setPage(1);
                    }}
                    className={`rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
                      statusFilter === 'active'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('inactive');
                      setPage(1);
                    }}
                    className={`rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
                      statusFilter === 'inactive'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Deactivated
                  </button>
                </div>
              </div>

              {(search || roleFilter !== 'all' || statusFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {isError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <h3 className="mt-3 text-lg font-semibold text-foreground">
              Failed to load users
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md">
              {error instanceof Error
                ? error.message
                : 'An error occurred while fetching users.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="mt-4 gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      {!isError && (
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Users ({meta?.total ?? users.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto">
              <table
                className="w-full text-left text-sm"
                data-testid="admin-users-table"
              >
                <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Reviews</th>
                    <th className="px-4 py-3 font-semibold">Joined</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading &&
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`skeleton-${i}`}>
                        <td className="px-4 py-3.5">
                          <Skeleton className="h-4 w-36 mb-1" />
                          <Skeleton className="h-3 w-48" />
                        </td>
                        <td className="px-4 py-3.5">
                          <Skeleton className="h-5 w-16" />
                        </td>
                        <td className="px-4 py-3.5">
                          <Skeleton className="h-5 w-16" />
                        </td>
                        <td className="px-4 py-3.5">
                          <Skeleton className="h-4 w-12" />
                        </td>
                        <td className="px-4 py-3.5">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Skeleton className="h-8 w-24 ml-auto" />
                        </td>
                      </tr>
                    ))}

                  {!isLoading && users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <Users className="mx-auto h-10 w-10 text-muted-foreground" />
                        <h4 className="mt-3 text-sm font-semibold text-foreground">
                          No users found
                        </h4>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {search ||
                          roleFilter !== 'all' ||
                          statusFilter !== 'all'
                            ? 'No users match your applied filters.'
                            : 'No user accounts have been created yet.'}
                        </p>
                        {(search ||
                          roleFilter !== 'all' ||
                          statusFilter !== 'all') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetFilters}
                            className="mt-3"
                          >
                            Reset filters
                          </Button>
                        )}
                      </td>
                    </tr>
                  )}

                  {!isLoading &&
                    users.map((targetUser) => {
                      const isSelf = currentUser?.id === targetUser.id;

                      return (
                        <tr
                          key={targetUser.id}
                          className="hover:bg-muted/30 transition-colors"
                          data-testid={`user-row-${targetUser.id}`}
                        >
                          {/* Name and Email */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {targetUser.name}
                              </span>
                              {isSelf && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 font-normal"
                                >
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {targetUser.email}
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-4 py-3.5">
                            {targetUser.role === 'admin' ? (
                              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800 flex items-center gap-1 w-fit">
                                <ShieldCheck className="h-3 w-3" />
                                <span>Admin</span>
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-muted-foreground flex items-center gap-1 w-fit"
                              >
                                <Users className="h-3 w-3" />
                                <span>Customer</span>
                              </Badge>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            {targetUser.is_active ? (
                              <Badge
                                variant="positive"
                                className="flex items-center gap-1 w-fit"
                              >
                                <CheckCircle className="h-3 w-3" />
                                <span>Active</span>
                              </Badge>
                            ) : (
                              <Badge
                                variant="negative"
                                className="flex items-center gap-1 w-fit"
                              >
                                <UserX className="h-3 w-3" />
                                <span>Deactivated</span>
                              </Badge>
                            )}
                          </td>

                          {/* Reviews Count */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>{targetUser.reviews_count}</span>
                            </div>
                          </td>

                          {/* Join Date */}
                          <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(targetUser.created_at).toLocaleDateString(
                              undefined,
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              },
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Role Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isSelf}
                                onClick={() => handleOpenRoleDialog(targetUser)}
                                title={
                                  isSelf
                                    ? 'You cannot change your own role.'
                                    : targetUser.role === 'admin'
                                      ? 'Demote to Customer'
                                      : 'Promote to Admin'
                                }
                                data-testid={`toggle-role-btn-${targetUser.id}`}
                                className="h-8 px-2 text-xs gap-1"
                              >
                                <Shield className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">
                                  {targetUser.role === 'admin'
                                    ? 'Remove Admin'
                                    : 'Make Admin'}
                                </span>
                              </Button>

                              {/* Status Toggle Button */}
                              {targetUser.is_active ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isSelf}
                                  onClick={() =>
                                    handleOpenStatusDialog(targetUser)
                                  }
                                  title={
                                    isSelf
                                      ? 'You cannot deactivate your own account.'
                                      : 'Deactivate User'
                                  }
                                  data-testid={`toggle-status-btn-${targetUser.id}`}
                                  className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 gap-1"
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">
                                    Deactivate
                                  </span>
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isSelf}
                                  onClick={() =>
                                    handleOpenStatusDialog(targetUser)
                                  }
                                  title="Activate User"
                                  data-testid={`toggle-status-btn-${targetUser.id}`}
                                  className="h-8 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1"
                                >
                                  <UserCheck className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">
                                    Activate
                                  </span>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3 sm:px-6">
                <div className="text-xs text-muted-foreground">
                  Showing page{' '}
                  <span className="font-medium">{meta.current_page}</span> of{' '}
                  <span className="font-medium">{meta.last_page}</span> (
                  {meta.total} total)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={meta.current_page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={meta.current_page >= meta.last_page}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status Toggle Confirmation Dialog */}
      <Dialog
        open={statusDialogUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            setStatusDialogUser(null);
            setActionError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {statusDialogUser?.is_active ? (
                <>
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  <span>Deactivate User Account</span>
                </>
              ) : (
                <>
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                  <span>Activate User Account</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {statusDialogUser?.is_active ? (
                <>
                  Are you sure you want to deactivate{' '}
                  <strong className="text-foreground">
                    {statusDialogUser?.name}
                  </strong>{' '}
                  ({statusDialogUser?.email})? They will be immediately logged
                  out on their next request and barred from logging back in.
                </>
              ) : (
                <>
                  Re-activate account for{' '}
                  <strong className="text-foreground">
                    {statusDialogUser?.name}
                  </strong>{' '}
                  ({statusDialogUser?.email})? They will regain ability to log
                  in and access Pickwise.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              data-testid="status-action-error"
            >
              {actionError}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={isUpdating}
              onClick={() => {
                setStatusDialogUser(null);
                setActionError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={statusDialogUser?.is_active ? 'destructive' : 'default'}
              disabled={isUpdating}
              onClick={() => void handleConfirmStatusToggle()}
              data-testid="confirm-status-btn"
            >
              {isUpdating
                ? 'Updating...'
                : statusDialogUser?.is_active
                  ? 'Deactivate Account'
                  : 'Activate Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Confirmation Dialog */}
      <Dialog
        open={roleDialogUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRoleDialogUser(null);
            setActionError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span>Change User Role</span>
            </DialogTitle>
            <DialogDescription>
              {roleDialogUser?.role === 'admin' ? (
                <>
                  Remove administrator privileges from{' '}
                  <strong className="text-foreground">
                    {roleDialogUser?.name}
                  </strong>{' '}
                  ({roleDialogUser?.email})? They will be demoted to a regular
                  Customer account and will lose access to all admin panel
                  resources.
                </>
              ) : (
                <>
                  Grant administrator privileges to{' '}
                  <strong className="text-foreground">
                    {roleDialogUser?.name}
                  </strong>{' '}
                  ({roleDialogUser?.email})? They will have full access to
                  manage catalog, products, users, reviews, and audit logs.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              data-testid="role-action-error"
            >
              {actionError}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={isUpdating}
              onClick={() => {
                setRoleDialogUser(null);
                setActionError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={isUpdating}
              onClick={() => void handleConfirmRoleChange()}
              data-testid="confirm-role-btn"
            >
              {isUpdating
                ? 'Updating...'
                : roleDialogUser?.role === 'admin'
                  ? 'Demote to Customer'
                  : 'Promote to Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
