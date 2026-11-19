import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  FolderTree,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Trash2,
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
import { ApiError } from '@/lib/api-client';
import { deleteAdminCategory, useAdminCategories } from '../api/admin-api';
import { CategoryFormDialog } from '../components/CategoryFormDialog';
import { SpecDefinitionDrawer } from '../components/SpecDefinitionDrawer';
import type { AdminCategory } from '../types';

export function AdminCategoriesPage() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(
    null,
  );
  const [specCategory, setSpecCategory] = useState<AdminCategory | null>(null);
  const [isSpecDrawerOpen, setIsSpecDrawerOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] =
    useState<AdminCategory | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filters = useMemo(() => {
    return {
      search: search.trim() ? search.trim() : undefined,
      is_active: activeFilter === 'all' ? undefined : activeFilter === 'active',
      per_page: 100,
    };
  }, [search, activeFilter]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminCategories(filters);

  const categories = data?.data ?? [];

  function handleStartCreate(): void {
    setEditingCategory(null);
    setIsFormOpen(true);
  }

  function handleStartEdit(category: AdminCategory): void {
    setEditingCategory(category);
    setIsFormOpen(true);
  }

  function handleOpenSpecs(category: AdminCategory): void {
    setSpecCategory(category);
    setIsSpecDrawerOpen(true);
  }

  function handleStartDelete(category: AdminCategory): void {
    setDeleteError(null);
    setDeletingCategory(category);
  }

  async function handleConfirmDelete(): Promise<void> {
    if (!deletingCategory) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteAdminCategory(deletingCategory.id);
      toast.success(`Category "${deletingCategory.name}" deleted.`);
      setDeletingCategory(null);
      await refetch();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setDeleteError(
          err.message || 'Cannot delete category that contains products.',
        );
      } else {
        setDeleteError(
          'An unexpected error occurred while deleting the category.',
        );
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Categories & Specs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure catalog category hierarchy and custom spec definitions for
            filters and comparisons.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
            aria-label="Refresh categories"
          >
            <RefreshCw
              className={`size-4 ${isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleStartCreate}
            className="gap-1.5"
          >
            <Plus className="size-4" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                placeholder="Search categories by name or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                Status:
              </span>
              <div className="inline-flex rounded-control border border-input bg-muted/30 p-0.5">
                {(['all', 'active', 'inactive'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    className={`rounded-control px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                      activeFilter === filter
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table or State */}
      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <AlertTriangle className="mx-auto size-8 text-destructive" />
            <p className="text-sm font-medium text-foreground">
              Failed to load categories
            </p>
            <p className="text-xs text-muted-foreground">
              {error instanceof Error
                ? error.message
                : 'Please check your connection.'}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <FolderTree
              className="mx-auto size-10 text-muted-foreground"
              strokeWidth={1}
            />
            <CardTitle className="text-base">No categories found</CardTitle>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {search || activeFilter !== 'all'
                ? 'No categories match your active filters. Try adjusting your search keywords.'
                : 'Get started by creating your first catalog category.'}
            </p>
            <Button
              type="button"
              size="sm"
              onClick={handleStartCreate}
              className="mt-2 gap-1.5"
            >
              <Plus className="size-4" />
              Add First Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="md:overflow-x-auto">
            <table className="block w-full text-left text-sm md:table">
              <caption className="sr-only">Category catalog hierarchy</caption>
              <thead className="hidden border-b border-border bg-muted/40 text-xs font-semibold tracking-wider text-muted-foreground uppercase md:table-header-group">
                <tr>
                  <th scope="col" className="px-4 py-3 sm:px-6">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Hierarchy
                  </th>
                  <th scope="col" className="px-4 py-3 text-center">
                    Order
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Products
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Specs
                  </th>
                  <th scope="col" className="px-4 py-3 text-right sm:px-6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="block divide-y divide-border md:table-row-group">
                {categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className="block space-y-2.5 p-4 transition-colors hover:bg-muted/30 md:table-row md:space-y-0 md:p-0"
                  >
                    <td className="block p-0 md:table-cell md:px-4 md:py-3.5 lg:px-6">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {cat.name}
                        </span>
                        <code className="font-mono text-[11px] text-muted-foreground">
                          /{cat.slug}
                        </code>
                      </div>
                    </td>

                    <td className="flex items-center justify-between gap-2 p-0 text-xs text-muted-foreground md:table-cell md:px-4 md:py-3.5">
                      <span className="font-medium text-muted-foreground md:hidden">
                        Hierarchy
                      </span>
                      {cat.parent ? (
                        <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-medium text-foreground">
                          Child of {cat.parent.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/80">Root</span>
                      )}
                    </td>

                    <td className="flex items-center justify-between gap-2 p-0 font-mono text-xs md:table-cell md:px-4 md:py-3.5 md:text-center">
                      <span className="font-sans font-medium text-muted-foreground md:hidden">
                        Order
                      </span>
                      <span>{cat.sort_order}</span>
                    </td>

                    <td className="flex items-center justify-between gap-2 p-0 md:table-cell md:px-4 md:py-3.5">
                      <span className="text-xs font-medium text-muted-foreground md:hidden">
                        Status
                      </span>
                      <Badge
                        variant={cat.is_active ? 'default' : 'secondary'}
                        className="text-[10px] font-semibold tracking-wider uppercase"
                      >
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    <td className="flex items-center justify-between gap-2 p-0 text-xs md:table-cell md:px-4 md:py-3.5">
                      <span className="font-medium text-muted-foreground md:hidden">
                        Products
                      </span>
                      <span>
                        <span className="font-medium text-foreground">
                          {cat.products_count}
                        </span>{' '}
                        <span className="text-muted-foreground">
                          product{cat.products_count === 1 ? '' : 's'}
                        </span>
                      </span>
                    </td>

                    <td className="flex items-center justify-between gap-2 p-0 text-xs md:table-cell md:px-4 md:py-3.5">
                      <span className="font-medium text-muted-foreground md:hidden">
                        Specs
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => handleOpenSpecs(cat)}
                        title={`Configure specs for ${cat.name}`}
                        className="gap-1.5"
                      >
                        <Sliders className="size-3 text-primary" />
                        Specs ({cat.spec_definitions_count})
                      </Button>
                    </td>

                    <td className="block border-t border-border/50 pt-2.5 text-right md:table-cell md:border-t-0 md:px-4 md:py-3.5 lg:px-6">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => handleStartEdit(cat)}
                          title={`Edit ${cat.name}`}
                        >
                          Edit
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleStartDelete(cat)}
                          aria-label={`Delete ${cat.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Category Create / Edit Dialog */}
      <CategoryFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        category={editingCategory}
        parentOptions={categories}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Spec Definitions Drawer */}
      <SpecDefinitionDrawer
        category={specCategory}
        open={isSpecDrawerOpen}
        onOpenChange={setIsSpecDrawerOpen}
        onSpecsChanged={() => {
          refetch();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deletingCategory !== null}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              <DialogTitle>Delete Category</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deletingCategory?.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          {deletingCategory && deletingCategory.products_count > 0 ? (
            <div
              role="alert"
              className="space-y-1 rounded-control border border-warning/35 bg-warning-subtle p-3 text-xs text-foreground dark:text-warning"
            >
              <p className="font-semibold">Category contains products</p>
              <p>
                This category currently contains{' '}
                {deletingCategory.products_count} product
                {deletingCategory.products_count === 1 ? '' : 's'}. Categories
                with products cannot be deleted. You must move or reassign them
                first.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              This action will remove the category and its associated spec
              definitions. This cannot be undone.
            </p>
          )}

          {deleteError && (
            <div
              role="alert"
              className="rounded-control border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
            >
              {deleteError}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingCategory(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={
                isDeleting ||
                (deletingCategory !== null &&
                  deletingCategory.products_count > 0)
              }
            >
              {isDeleting ? 'Deleting...' : 'Delete Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
