import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { RatingStars } from '@/components/shared/RatingStars';
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
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api-client';
import {
  bulkModerateAdminReviews,
  deleteAdminReview,
  moderateAdminReview,
  useAdminReviews,
} from '../api/admin-api';
import type {
  AdminReview,
  AdminReviewFilters,
  ReviewModerationStatus,
} from '../types';

function formatReviewDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function AdminReviewsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    ReviewModerationStatus | 'all'
  >('pending');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [sort, setSort] = useState<string>('-created_at');
  const [page, setPage] = useState<number>(1);
  const perPage = 20;

  // Selected review IDs for bulk operations
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Dialog states
  const [rejectDialogReview, setRejectDialogReview] =
    useState<AdminReview | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isBulkReject, setIsBulkReject] = useState(false);

  const [deleteDialogReview, setDeleteDialogReview] =
    useState<AdminReview | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const filters: AdminReviewFilters = useMemo(() => {
    return {
      status: statusFilter,
      search: search.trim() ? search.trim() : undefined,
      rating: typeof ratingFilter === 'number' ? ratingFilter : undefined,
      sort,
      page,
      per_page: perPage,
    };
  }, [statusFilter, search, ratingFilter, sort, page]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminReviews(filters);

  const reviews = useMemo(() => data?.data ?? [], [data?.data]);
  const meta = data?.meta;

  const allPageIds = useMemo(() => reviews.map((r) => r.id), [reviews]);
  const isAllSelected =
    allPageIds.length > 0 && allPageIds.every((id) => selectedIds.includes(id));

  function toggleSelectAll(): void {
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allPageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allPageIds])));
    }
  }

  function toggleSelectOne(id: number): void {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function handleApproveSingle(review: AdminReview): Promise<void> {
    setIsSubmitting(true);
    try {
      await moderateAdminReview(review.id, { status: 'approved' });
      toast.success(
        `Review for "${review.product?.name ?? 'product'}" approved.`,
      );
      await refetch();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to approve review.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenRejectSingle(review: AdminReview): void {
    setActionError(null);
    setRejectReason('');
    setIsBulkReject(false);
    setRejectDialogReview(review);
  }

  function handleOpenRejectBulk(): void {
    if (selectedIds.length === 0) return;
    setActionError(null);
    setRejectReason('');
    setIsBulkReject(true);
    setRejectDialogReview(null);
  }

  async function handleConfirmReject(): Promise<void> {
    setIsSubmitting(true);
    setActionError(null);

    try {
      if (isBulkReject) {
        await bulkModerateAdminReviews({
          review_ids: selectedIds,
          status: 'rejected',
          reason: rejectReason.trim() ? rejectReason.trim() : undefined,
        });
        toast.success(`Rejected ${selectedIds.length} reviews.`);
        setSelectedIds([]);
        setIsBulkReject(false);
      } else if (rejectDialogReview) {
        await moderateAdminReview(rejectDialogReview.id, {
          status: 'rejected',
          reason: rejectReason.trim() ? rejectReason.trim() : undefined,
        });
        toast.success(
          `Review for "${rejectDialogReview.product?.name ?? 'product'}" rejected.`,
        );
        setRejectDialogReview(null);
      }
      await refetch();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to reject review.';
      setActionError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBulkApprove(): Promise<void> {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);

    try {
      await bulkModerateAdminReviews({
        review_ids: selectedIds,
        status: 'approved',
      });
      toast.success(`Approved ${selectedIds.length} reviews.`);
      setSelectedIds([]);
      await refetch();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to approve reviews.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenDelete(review: AdminReview): void {
    setActionError(null);
    setDeleteDialogReview(review);
  }

  async function handleConfirmDelete(): Promise<void> {
    if (!deleteDialogReview) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      await deleteAdminReview(deleteDialogReview.id);
      toast.success(
        `Review for "${deleteDialogReview.product?.name ?? 'product'}" deleted.`,
      );
      setSelectedIds((prev) =>
        prev.filter((id) => id !== deleteDialogReview.id),
      );
      setDeleteDialogReview(null);
      await refetch();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to delete review.';
      setActionError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleResetFilters(): void {
    setSearch('');
    setStatusFilter('pending');
    setRatingFilter('all');
    setSort('-created_at');
    setPage(1);
    setSelectedIds([]);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Review Moderation
          </h1>
          <p className="text-sm text-muted-foreground">
            Review customer submissions, approve helpful feedback, and ensure
            review integrity.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="self-start sm:self-auto"
        >
          <RefreshCw
            className={`mr-2 size-4 ${isFetching ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          Refresh
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border border-border bg-card">
        <CardContent className="space-y-4 pt-6">
          {/* Status Tabs */}
          <div
            role="group"
            aria-label="Filter by review status"
            className="flex flex-wrap items-center gap-2 border-b border-border pb-4"
          >
            <span className="mr-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Status:
            </span>
            <Button
              type="button"
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              aria-pressed={statusFilter === 'pending'}
              size="sm"
              onClick={() => {
                setStatusFilter('pending');
                setPage(1);
                setSelectedIds([]);
              }}
              className="rounded-full text-xs"
            >
              Pending
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'approved' ? 'default' : 'outline'}
              aria-pressed={statusFilter === 'approved'}
              size="sm"
              onClick={() => {
                setStatusFilter('approved');
                setPage(1);
                setSelectedIds([]);
              }}
              className="rounded-full text-xs"
            >
              Approved
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'rejected' ? 'default' : 'outline'}
              aria-pressed={statusFilter === 'rejected'}
              size="sm"
              onClick={() => {
                setStatusFilter('rejected');
                setPage(1);
                setSelectedIds([]);
              }}
              className="rounded-full text-xs"
            >
              Rejected
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              aria-pressed={statusFilter === 'all'}
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setPage(1);
                setSelectedIds([]);
              }}
              className="rounded-full text-xs"
            >
              All Statuses
            </Button>
          </div>

          {/* Search, Rating & Sort Controls */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder="Search reviews by title, body, author, or product..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Rating filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Rating:</span>
                <select
                  aria-label="Filter by rating"
                  value={ratingFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRatingFilter(val === 'all' ? 'all' : Number(val));
                    setPage(1);
                  }}
                  className="h-9 rounded-control border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <option value="all">All Stars</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Sort:</span>
                <select
                  aria-label="Sort reviews"
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-control border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <option value="-created_at">Newest First</option>
                  <option value="created_at">Oldest First</option>
                  <option value="-rating">Highest Rating</option>
                  <option value="rating">Lowest Rating</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Bar (when items selected) */}
      {selectedIds.length > 0 && (
        <div
          data-testid="admin-bulk-action-bar"
          className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-primary/30 bg-primary/10 px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {selectedIds.length === 1
                ? '1 review selected'
                : `${selectedIds.length} reviews selected`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => void handleBulkApprove()}
              disabled={isSubmitting}
              className="bg-positive text-positive-foreground hover:bg-positive/90"
            >
              <Check className="mr-1.5 size-4" aria-hidden="true" />
              Approve Selected
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenRejectBulk}
              disabled={isSubmitting}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <XCircle className="mr-1.5 size-4" aria-hidden="true" />
              Reject Selected
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* Main Review List */}
      <Card className="border border-border bg-card">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="select-all-reviews"
              aria-label="Select all reviews on this page"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              disabled={reviews.length === 0}
              className="size-4 rounded border-border text-primary focus:ring-ring"
            />
            <CardTitle className="text-base font-semibold text-foreground">
              Reviews Queue
            </CardTitle>
          </div>

          {meta && (
            <p className="text-xs text-muted-foreground">
              Showing {reviews.length} of {meta.total} reviews
            </p>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-4 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 rounded-control border border-border/60 p-4"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center rounded-control border border-destructive/20 bg-destructive/5 py-12 text-center">
              <AlertTriangle
                className="size-8 text-destructive"
                aria-hidden="true"
              />
              <p className="mt-2 text-sm font-medium text-foreground">
                Failed to load reviews
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {error instanceof ApiError
                  ? error.message
                  : 'An error occurred while fetching review data.'}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-control border border-dashed border-border py-16 text-center">
              {statusFilter === 'pending' &&
              !search &&
              ratingFilter === 'all' ? (
                <>
                  <CheckCircle2
                    className="size-10 text-positive"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-base font-semibold text-foreground">
                    No reviews waiting for approval
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                    All submitted shopper reviews have been moderated. Check
                    approved or rejected tabs to review past submissions.
                  </p>
                </>
              ) : (
                <>
                  <MessageSquare
                    className="size-10 text-muted-foreground/60"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-base font-semibold text-foreground">
                    No reviews found
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                    No reviews matched your current search and filter criteria.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    className="mt-4"
                  >
                    Reset Filters
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div
              data-testid="admin-reviews-list"
              className="divide-y divide-border/60"
            >
              {reviews.map((review) => {
                const isSelected = selectedIds.includes(review.id);
                return (
                  <div
                    key={review.id}
                    data-testid={`admin-review-row-${review.id}`}
                    className={`flex flex-col gap-3 py-4 transition-colors first:pt-2 last:pb-2 ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                  >
                    {/* Top Row: checkbox, product link, status badge */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          aria-label={`Select review ${review.id}`}
                          checked={isSelected}
                          onChange={() => toggleSelectOne(review.id)}
                          className="mt-1 size-4 rounded border-border text-primary focus:ring-ring"
                        />

                        <div>
                          {review.product ? (
                            <Link
                              to={`/products/${review.product.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary hover:underline"
                            >
                              {review.product.name}
                              <ExternalLink
                                className="size-3 text-muted-foreground"
                                aria-hidden="true"
                              />
                            </Link>
                          ) : (
                            <span className="text-sm font-medium text-muted-foreground">
                              (Unassigned Product)
                            </span>
                          )}

                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>By {review.author_name}</span>
                            {review.user?.email && (
                              <span>({review.user.email})</span>
                            )}
                            <span>•</span>
                            <time dateTime={review.created_at}>
                              {formatReviewDate(review.created_at)}
                            </time>
                          </div>
                        </div>
                      </div>

                      {/* Status and Rating */}
                      <div className="flex items-center gap-2">
                        {review.status === 'pending' && (
                          <Badge
                            variant="outline"
                            className="border-warning/35 bg-warning-subtle text-foreground dark:text-warning"
                          >
                            Pending
                          </Badge>
                        )}
                        {review.status === 'approved' && (
                          <Badge
                            variant="outline"
                            className="border-positive/30 bg-positive/10 text-positive"
                          >
                            Approved
                          </Badge>
                        )}
                        {review.status === 'rejected' && (
                          <Badge
                            variant="outline"
                            className="border-destructive/30 bg-destructive/10 text-destructive"
                          >
                            Rejected
                          </Badge>
                        )}

                        <div className="flex items-center gap-1 rounded-control bg-muted/50 px-2 py-0.5">
                          <RatingStars rating={review.rating} size="sm" />
                          <span className="text-xs font-semibold text-foreground">
                            {review.rating}/5
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Review Title and Body */}
                    <div className="pl-0 sm:pl-7">
                      <h3 className="text-sm font-semibold text-foreground">
                        {review.title}
                      </h3>
                      <p className="mt-1 text-sm text-foreground/90 whitespace-pre-line">
                        {review.body}
                      </p>

                      {/* Moderation metadata */}
                      {review.moderator && review.moderated_at && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Moderated by {review.moderator.name} on{' '}
                          {formatReviewDate(review.moderated_at)}
                        </p>
                      )}
                    </div>

                    {/* Action Bar per Review */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pl-0 pt-1 sm:pl-7">
                      {review.status !== 'approved' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          title={`Approve review by ${review.author_name} for ${review.product?.name ?? 'product'}`}
                          onClick={() => void handleApproveSingle(review)}
                          disabled={isSubmitting}
                          className="text-positive hover:bg-positive/10 hover:text-positive"
                        >
                          <Check
                            className="mr-1.5 size-3.5"
                            aria-hidden="true"
                          />
                          Approve
                        </Button>
                      )}

                      {review.status !== 'rejected' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          title={`Reject review by ${review.author_name} for ${review.product?.name ?? 'product'}`}
                          onClick={() => handleOpenRejectSingle(review)}
                          disabled={isSubmitting}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <XCircle
                            className="mr-1.5 size-3.5"
                            aria-hidden="true"
                          />
                          Reject
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDelete(review)}
                        disabled={isSubmitting}
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete review ${review.id}`}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {meta && meta.last_page > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
              <span className="text-xs text-muted-foreground">
                Page {meta.current_page} of {meta.last_page} ({meta.total} total
                reviews)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={meta.current_page <= 1 || isFetching}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={meta.current_page >= meta.last_page || isFetching}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Confirmation Dialog (single or bulk) */}
      <Dialog
        open={rejectDialogReview !== null || isBulkReject}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialogReview(null);
            setIsBulkReject(false);
            setActionError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isBulkReject
                ? `Reject ${selectedIds.length} Reviews`
                : 'Reject Review'}
            </DialogTitle>
            <DialogDescription>
              {isBulkReject
                ? 'Rejected reviews are hidden from product pages and recalculate ratings.'
                : `Are you sure you want to reject the review by ${
                    rejectDialogReview?.author_name ?? 'this reviewer'
                  }?`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label
              htmlFor="reject-reason"
              className="text-xs font-medium text-foreground"
            >
              Rejection Reason (optional, logged in audit trail):
            </label>
            <Textarea
              id="reject-reason"
              placeholder="e.g., Promotional external links, abusive language, or unverified claims..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              maxLength={500}
            />

            {actionError && (
              <div className="rounded-control bg-destructive/10 p-2 text-xs text-destructive">
                {actionError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectDialogReview(null);
                setIsBulkReject(false);
                setActionError(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmReject()}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogReview !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogReview(null);
            setActionError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this review for "
              {deleteDialogReview?.product?.name ?? 'product'}"? This action
              cannot be undone. If approved, ratings and AI review summaries
              will be automatically recalculated.
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div className="rounded-control bg-destructive/10 p-2 text-xs text-destructive">
              {actionError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteDialogReview(null);
                setActionError(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
