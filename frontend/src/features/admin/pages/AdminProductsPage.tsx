import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Package,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  bulkUpdateAdminProductStatus,
  deleteAdminProduct,
  regenerateProductReviewSummary,
  useAdminBrands,
  useAdminCategories,
  useAdminProducts,
} from '../api/admin-api';
import { ProductFormDialog } from '../components/ProductFormDialog';
import { ProductImagesManagerDialog } from '../components/ProductImagesManagerDialog';
import type { AdminProduct, AdminProductFilters } from '../types';

export function AdminProductsPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'published' | 'draft'
  >('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('');
  const [sort, setSort] = useState<string>('-created_at');
  const [page, setPage] = useState<number>(1);
  const perPage = 25;

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(
    null,
  );
  const [imagesProduct, setImagesProduct] = useState<AdminProduct | null>(null);
  const [isImagesOpen, setIsImagesOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<AdminProduct | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const filters: AdminProductFilters = useMemo(() => {
    return {
      search: search.trim() ? search.trim() : undefined,
      category_id: selectedCategory ? Number(selectedCategory) : undefined,
      brand_id: selectedBrand ? Number(selectedBrand) : undefined,
      is_published:
        statusFilter === 'all' ? undefined : statusFilter === 'published',
      availability: availabilityFilter || undefined,
      sort,
      page,
      per_page: perPage,
    };
  }, [
    search,
    selectedCategory,
    selectedBrand,
    statusFilter,
    availabilityFilter,
    sort,
    page,
    perPage,
  ]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminProducts(filters);
  const { data: categoriesData } = useAdminCategories({ per_page: 100 });
  const { data: brandsData } = useAdminBrands({ per_page: 100 });

  const products = useMemo(() => data?.data ?? [], [data?.data]);
  const meta = data?.meta;
  const categories = useMemo(
    () => categoriesData?.data ?? [],
    [categoriesData?.data],
  );
  const brands = useMemo(() => brandsData?.data ?? [], [brandsData?.data]);

  const allPageIds = useMemo(() => products.map((p) => p.id), [products]);
  const isAllSelected =
    allPageIds.length > 0 && allPageIds.every((id) => selectedIds.includes(id));
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  function handleSelectAll(checked: boolean): void {
    if (checked) {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allPageIds])));
    } else {
      setSelectedIds((prev) => prev.filter((id) => !allPageIds.includes(id)));
    }
  }

  function handleToggleSelect(productId: number): void {
    setSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  }

  function handleStartCreate(): void {
    setEditingProduct(null);
    setIsFormOpen(true);
  }

  function handleStartEdit(product: AdminProduct): void {
    setEditingProduct(product);
    setIsFormOpen(true);
  }

  function handleOpenImages(product: AdminProduct): void {
    setImagesProduct(product);
    setIsImagesOpen(true);
  }

  function handleStartDelete(product: AdminProduct): void {
    setDeletingProduct(product);
  }

  async function handleConfirmDelete(): Promise<void> {
    if (!deletingProduct) return;
    setIsDeleting(true);

    try {
      await deleteAdminProduct(deletingProduct.id);
      toast.success(`Product "${deletingProduct.name}" deleted.`);
      setDeletingProduct(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deletingProduct.id));
      await refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete product.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleBulkStatus(publish: boolean): Promise<void> {
    if (selectedIds.length === 0) return;
    setIsBulkUpdating(true);

    try {
      await bulkUpdateAdminProductStatus({
        product_ids: selectedIds,
        is_published: publish,
      });
      toast.success(
        `${publish ? 'Published' : 'Unpublished'} ${selectedIds.length} product${
          selectedIds.length === 1 ? '' : 's'
        }.`,
      );
      setSelectedIds([]);
      await refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Bulk status update failed.',
      );
    } finally {
      setIsBulkUpdating(false);
    }
  }

  function clearAllFilters(): void {
    setSearch('');
    setSelectedCategory('');
    setSelectedBrand('');
    setStatusFilter('all');
    setAvailabilityFilter('');
    setSort('-created_at');
    setPage(1);
  }

  async function handleRegenerateSummary(product: AdminProduct): Promise<void> {
    try {
      await regenerateProductReviewSummary(product.id);
      toast.success(`Queued AI summary regeneration for "${product.name}".`);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to queue summary regeneration.',
      );
    }
  }

  const hasActiveFilters = Boolean(
    search ||
    selectedCategory ||
    selectedBrand ||
    statusFilter !== 'all' ||
    availabilityFilter,
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Product catalog
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage catalog products, pricing, specifications, and media.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
            aria-label="Refresh products"
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
            Add product
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name, slug, or brand..."
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
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-control border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Filter by category"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-control border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Filter by brand"
              >
                <option value="">All brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(
                    e.target.value as 'all' | 'published' | 'draft',
                  );
                  setPage(1);
                }}
                className="h-10 rounded-control border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft (Unpublished)</option>
              </select>

              <select
                value={availabilityFilter}
                onChange={(e) => {
                  setAvailabilityFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-control border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Filter by availability"
              >
                <option value="">All stock</option>
                <option value="in_stock">In stock</option>
                <option value="out_of_stock">Out of stock</option>
                <option value="preorder">Pre-order</option>
                <option value="discontinued">Discontinued</option>
              </select>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-10 rounded-control border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Sort products"
              >
                <option value="-created_at">Newest first</option>
                <option value="created_at">Oldest first</option>
                <option value="name">Name (A-Z)</option>
                <option value="-name">Name (Z-A)</option>
                <option value="price">Price (Low to High)</option>
                <option value="-price">Price (High to Low)</option>
                <option value="-value_score">Highest Value Score</option>
              </select>

              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-primary/30 bg-primary/5 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary">
              {selectedIds.length} product{selectedIds.length === 1 ? '' : 's'}{' '}
              selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => handleBulkStatus(true)}
              disabled={isBulkUpdating}
              className="gap-1"
            >
              <Eye className="size-3 text-emerald-600" />
              Publish selected
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => handleBulkStatus(false)}
              disabled={isBulkUpdating}
              className="gap-1"
            >
              <EyeOff className="size-3 text-muted-foreground" />
              Unpublish selected
            </Button>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="text-xs text-muted-foreground"
            >
              Deselect
            </Button>
          </div>
        </div>
      )}

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
              Failed to load products
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
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <Package
              className="mx-auto size-10 text-muted-foreground"
              strokeWidth={1}
            />
            <CardTitle className="text-base">No products found</CardTitle>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {hasActiveFilters
                ? 'No products match your active search and filter criteria. Try resetting filters.'
                : 'Get started by creating your first catalog product.'}
            </p>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="mt-2"
              >
                Clear filters
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleStartCreate}
                className="mt-2 gap-1.5"
              >
                <Plus className="size-4" />
                Add first product
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Product catalog management</caption>
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="w-10 px-4 py-3 text-center">
                    <Checkbox
                      checked={
                        isAllSelected
                          ? true
                          : isSomeSelected
                            ? 'indeterminate'
                            : false
                      }
                      onCheckedChange={(checked) =>
                        handleSelectAll(Boolean(checked))
                      }
                      aria-label="Select all products on page"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3">Product</th>
                  <th scope="col" className="px-4 py-3">Category</th>
                  <th scope="col" className="px-4 py-3">Price</th>
                  <th scope="col" className="px-4 py-3">Stock</th>
                  <th scope="col" className="px-4 py-3 text-center">Score / Rating</th>
                  <th scope="col" className="px-4 py-3 text-center">Status</th>
                  <th scope="col" className="px-4 py-3 text-right sm:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((product) => {
                  const isSelected = selectedIds.includes(product.id);

                  return (
                    <tr
                      key={product.id}
                      className={`transition-colors hover:bg-muted/30 ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelect(product.id)}
                          aria-label={`Select ${product.name}`}
                        />
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative size-10 shrink-0 overflow-hidden rounded border border-border bg-muted/30">
                            {product.primary_image?.url ? (
                              <img
                                src={product.primary_image.url}
                                alt={product.primary_image.alt_text}
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center text-muted-foreground/60">
                                <Package className="size-5" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span
                              className="font-medium text-foreground truncate max-w-xs"
                              title={product.name}
                            >
                              {product.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              {product.brand?.name && (
                                <span className="font-medium">
                                  {product.brand.name}
                                </span>
                              )}
                              <span>•</span>
                              <code className="text-[11px] font-mono">
                                /{product.slug}
                              </code>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge
                          variant="outline"
                          className="text-xs font-normal"
                        >
                          {product.category?.name ?? 'Uncategorized'}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-foreground">
                        {product.price.formatted}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-control px-2 py-0.5 text-[11px] font-medium ${
                            product.availability === 'in_stock'
                              ? 'bg-positive-subtle text-positive'
                              : product.availability === 'out_of_stock'
                                ? 'bg-negative-subtle text-negative'
                                : product.availability === 'preorder'
                                  ? 'border border-warning/35 bg-warning-subtle text-foreground dark:text-warning'
                                  : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {product.availability_label}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center text-xs">
                        <div className="flex flex-col items-center">
                          {product.value_score !== null ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-accent-foreground font-mono">
                              VS {product.value_score}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              —
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            ★ {product.rating_avg.toFixed(1)} (
                            {product.rating_count})
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <Badge
                          variant={
                            product.is_published ? 'default' : 'secondary'
                          }
                          className="text-[10px] uppercase font-semibold tracking-wider"
                        >
                          {product.is_published ? 'Published' : 'Draft'}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5 text-right sm:px-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => handleStartEdit(product)}
                            title={`Edit ${product.name}`}
                          >
                            Edit
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => handleOpenImages(product)}
                            className="gap-1 text-xs"
                            title="Manage gallery images"
                          >
                            <ImageIcon className="size-3 text-primary" />
                            Images
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() =>
                              void handleRegenerateSummary(product)
                            }
                            className="gap-1 text-xs"
                            title="Regenerate AI review summary"
                            aria-label={`Regenerate review summary for ${product.name}`}
                          >
                            <Sparkles className="size-3 text-amber-500" />
                            Summary
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleStartDelete(product)}
                            aria-label={`Delete ${product.name}`}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-6">
              <span className="text-xs text-muted-foreground">
                Page {meta.current_page} of {meta.last_page} ({meta.total}{' '}
                products)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isFetching}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    setPage((p) => Math.min(meta.last_page, p + 1))
                  }
                  disabled={page >= meta.last_page || isFetching}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Product Form Dialog */}
      <ProductFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        product={editingProduct}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Product Images Manager Dialog */}
      <ProductImagesManagerDialog
        product={imagesProduct}
        open={isImagesOpen}
        onOpenChange={setIsImagesOpen}
        onImagesChanged={() => {
          refetch();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deletingProduct !== null}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              <DialogTitle>Delete product</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong className="text-foreground">
                {deletingProduct?.name}
              </strong>
              ? This will remove the product from the public catalog. (The
              record is soft-deleted).
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingProduct(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
