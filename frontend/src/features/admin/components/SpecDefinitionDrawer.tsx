import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  Filter,
  Plus,
  Search,
  Sliders,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api-client';
import {
  createAdminSpecDefinition,
  deleteAdminSpecDefinition,
  updateAdminSpecDefinition,
  useAdminCategorySpecs,
} from '../api/admin-api';
import type {
  AdminCategory,
  AdminSpecDefinition,
  AdminSpecDefinitionFormData,
} from '../types';

const specFormSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2, 'Key must be at least 2 characters.')
    .max(80, 'Key cannot exceed 80 characters.')
    .regex(
      /^[a-z0-9_]+$/,
      'Key must contain lowercase letters, numbers, and underscores only.',
    ),
  label: z
    .string()
    .trim()
    .min(2, 'Label must be at least 2 characters.')
    .max(120, 'Label cannot exceed 120 characters.'),
  unit: z.string().trim().max(30).optional().or(z.literal('')),
  data_type: z.enum(['number', 'text', 'boolean']),
  is_filterable: z.boolean(),
  is_comparable: z.boolean(),
  higher_is_better: z.boolean().nullable(),
  sort_order: z.number().min(0),
});

type SpecFormValues = z.infer<typeof specFormSchema>;

interface SpecDefinitionDrawerProps {
  category: AdminCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSpecsChanged?: () => void;
}

export function SpecDefinitionDrawer({
  category,
  open,
  onOpenChange,
  onSpecsChanged,
}: SpecDefinitionDrawerProps) {
  const [search, setSearch] = useState('');
  const [editingSpec, setEditingSpec] = useState<AdminSpecDefinition | null>(
    null,
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteSpec, setConfirmDeleteSpec] =
    useState<AdminSpecDefinition | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const categoryId = category?.id ?? 0;
  const {
    data: specs,
    isLoading,
    refetch,
  } = useAdminCategorySpecs(categoryId, search);

  const specDefaultValues: SpecFormValues = useMemo(() => {
    if (editingSpec) {
      return {
        key: editingSpec.key,
        label: editingSpec.label,
        unit: editingSpec.unit ?? '',
        data_type: editingSpec.data_type,
        is_filterable: editingSpec.is_filterable,
        is_comparable: editingSpec.is_comparable,
        higher_is_better: editingSpec.higher_is_better,
        sort_order: editingSpec.sort_order,
      };
    }

    return {
      key: '',
      label: '',
      unit: '',
      data_type: 'text',
      is_filterable: false,
      is_comparable: false,
      higher_is_better: null,
      sort_order: (specs?.length ?? 0) + 1,
    };
  }, [editingSpec, specs?.length]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<SpecFormValues>({
    resolver: zodResolver(specFormSchema),
    values: specDefaultValues,
  });

  const dataType = useWatch({ control, name: 'data_type' });
  const isFilterable = useWatch({ control, name: 'is_filterable' });
  const isComparable = useWatch({ control, name: 'is_comparable' });
  const higherIsBetter = useWatch({ control, name: 'higher_is_better' });

  function handleStartCreate(): void {
    setEditingSpec(null);
    setServerError(null);
    setIsFormOpen(true);
  }

  function handleCancelForm(): void {
    setEditingSpec(null);
    setServerError(null);
    setIsFormOpen(false);
  }

  async function onSubmit(values: SpecFormValues): Promise<void> {
    if (!category) return;
    setSubmitting(true);
    setServerError(null);

    const payload: AdminSpecDefinitionFormData = {
      key: values.key.trim().toLowerCase(),
      label: values.label.trim(),
      unit: values.unit?.trim() ? values.unit.trim() : null,
      data_type: values.data_type,
      is_filterable: values.is_filterable,
      is_comparable: values.is_comparable,
      higher_is_better:
        values.data_type === 'number' ? values.higher_is_better : null,
      sort_order: values.sort_order,
    };

    try {
      if (editingSpec) {
        await updateAdminSpecDefinition(category.id, editingSpec.id, payload);
        toast.success(`Spec definition "${payload.label}" updated.`);
      } else {
        await createAdminSpecDefinition(category.id, payload);
        toast.success(`Spec definition "${payload.label}" created.`);
      }

      await refetch();
      onSpecsChanged?.();
      handleCancelForm();
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        const details = (error.details ?? {}) as Record<string, string[]>;
        let hasFieldErrors = false;

        Object.entries(details).forEach(([field, messages]) => {
          if (field in values && messages && messages.length > 0) {
            setError(field as keyof SpecFormValues, {
              type: 'server',
              message: messages[0],
            });
            hasFieldErrors = true;
          }
        });

        if (!hasFieldErrors) {
          setServerError(
            error.message || 'Validation failed. Please check inputs.',
          );
        }
      } else {
        setServerError('Failed to save spec definition.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(spec: AdminSpecDefinition): Promise<void> {
    if (!category) return;
    setDeletingId(spec.id);
    try {
      await deleteAdminSpecDefinition(category.id, spec.id);
      toast.success(`Spec "${spec.label}" deleted.`);
      await refetch();
      onSpecsChanged?.();
      setConfirmDeleteSpec(null);
    } catch {
      toast.error('Failed to delete spec definition.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto"
      >
        <SheetHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Sliders className="size-5 text-primary" strokeWidth={1.5} />
            <SheetTitle className="font-heading text-lg">
              {category?.name ?? 'Category'} Specs
            </SheetTitle>
          </div>
          <SheetDescription>
            Configure schema attributes, filterable facets, and comparison rules
            for products in this category.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {/* Action Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search specs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear spec search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {!isFormOpen && (
              <Button
                type="button"
                size="sm"
                onClick={handleStartCreate}
                className="gap-1.5 shrink-0"
              >
                <Plus className="size-4" />
                Add Spec
              </Button>
            )}
          </div>

          {/* Inline Form */}
          {isFormOpen && (
            <div className="rounded-panel border border-border bg-card p-4 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="text-sm font-semibold">
                  {editingSpec
                    ? `Edit Spec: ${editingSpec.label}`
                    : 'New Spec Definition'}
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleCancelForm}
                  aria-label="Cancel editing spec"
                >
                  <X className="size-4" />
                </Button>
              </div>

              {serverError && (
                <div
                  role="alert"
                  className="rounded-control border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive"
                >
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="spec-label" className="text-xs">
                      Label <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="spec-label"
                      placeholder="e.g. Battery Capacity"
                      {...register('label')}
                      aria-invalid={Boolean(errors.label)}
                      disabled={submitting}
                      className="h-8 text-xs"
                    />
                    {errors.label && (
                      <p className="text-[11px] text-destructive">
                        {errors.label.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="spec-key" className="text-xs">
                      Key (snake_case){' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="spec-key"
                      placeholder="e.g. battery_mah"
                      {...register('key')}
                      aria-invalid={Boolean(errors.key)}
                      disabled={submitting}
                      className="h-8 text-xs"
                    />
                    {errors.key && (
                      <p className="text-[11px] text-destructive">
                        {errors.key.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="spec-data-type" className="text-xs">
                      Data Type
                    </Label>
                    <select
                      id="spec-data-type"
                      {...register('data_type')}
                      disabled={submitting}
                      className="flex h-8 w-full rounded-control border border-input bg-background px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="number">Number</option>
                      <option value="text">Text</option>
                      <option value="boolean">Boolean</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="spec-unit" className="text-xs">
                      Unit (e.g. mAh, GB, W)
                    </Label>
                    <Input
                      id="spec-unit"
                      placeholder="e.g. mAh"
                      {...register('unit')}
                      disabled={submitting}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="spec-sort-order" className="text-xs">
                      Sort Order
                    </Label>
                    <Input
                      id="spec-sort-order"
                      type="number"
                      min={0}
                      {...register('sort_order', { valueAsNumber: true })}
                      disabled={submitting}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
                  <div className="flex items-center gap-1.5">
                    <Checkbox
                      id="spec-is-filterable"
                      checked={isFilterable}
                      onCheckedChange={(c) =>
                        setValue('is_filterable', Boolean(c))
                      }
                      disabled={submitting}
                    />
                    <Label
                      htmlFor="spec-is-filterable"
                      className="cursor-pointer text-xs font-normal"
                    >
                      Show in filters
                    </Label>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Checkbox
                      id="spec-is-comparable"
                      checked={isComparable}
                      onCheckedChange={(c) =>
                        setValue('is_comparable', Boolean(c))
                      }
                      disabled={submitting}
                    />
                    <Label
                      htmlFor="spec-is-comparable"
                      className="cursor-pointer text-xs font-normal"
                    >
                      Show in compare
                    </Label>
                  </div>

                  {dataType === 'number' && (
                    <div className="flex items-center gap-1.5">
                      <Checkbox
                        id="spec-higher-is-better"
                        checked={Boolean(higherIsBetter)}
                        onCheckedChange={(c) =>
                          setValue('higher_is_better', Boolean(c))
                        }
                        disabled={submitting}
                      />
                      <Label
                        htmlFor="spec-higher-is-better"
                        className="cursor-pointer text-xs font-normal"
                      >
                        Higher is better
                      </Label>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancelForm}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={submitting}>
                    {submitting
                      ? 'Saving...'
                      : editingSpec
                        ? 'Update Spec'
                        : 'Add Spec'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Delete Cascade Confirmation Alert */}
          {confirmDeleteSpec && (
            <div
              role="alert"
              className="rounded-panel border border-destructive/30 bg-destructive/10 p-3.5 space-y-2 text-xs"
            >
              <div className="flex items-center gap-2 font-semibold text-destructive">
                <AlertTriangle className="size-4" />
                Confirm Spec Deletion
              </div>
              <p className="text-foreground/90">
                Are you sure you want to delete{' '}
                <strong>{confirmDeleteSpec.label}</strong> (
                {confirmDeleteSpec.key})?
                {confirmDeleteSpec.product_specs_count > 0 && (
                  <span className="block mt-1 text-destructive font-medium">
                    Warning: This will cascade and delete saved spec values
                    across {confirmDeleteSpec.product_specs_count} products.
                  </span>
                )}
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setConfirmDeleteSpec(null)}
                  disabled={deletingId !== null}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="xs"
                  onClick={() => handleDelete(confirmDeleteSpec)}
                  disabled={deletingId !== null}
                >
                  {deletingId === confirmDeleteSpec.id
                    ? 'Deleting...'
                    : 'Delete Spec'}
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {/* Specs List */}
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full rounded-control" />
              <Skeleton className="h-12 w-full rounded-control" />
              <Skeleton className="h-12 w-full rounded-control" />
            </div>
          ) : specs && specs.length > 0 ? (
            <div className="divide-y divide-border rounded-panel border border-border">
              {specs.map((spec) => {
                const isNumber = spec.data_type === 'number';

                return (
                  <div
                    key={spec.id}
                    className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-sm text-foreground">
                          {spec.label}
                        </span>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground">
                          {spec.key}
                        </code>
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-semibold tracking-wider"
                        >
                          {spec.data_type}
                          {spec.unit ? ` (${spec.unit})` : ''}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {spec.is_filterable && (
                          <span className="inline-flex items-center gap-1 text-positive">
                            <Filter className="size-3" /> Filterable
                          </span>
                        )}
                        {spec.is_comparable && (
                          <span className="inline-flex items-center gap-1 text-primary">
                            <ArrowUpDown className="size-3" /> Comparable
                          </span>
                        )}
                        {isNumber && spec.higher_is_better !== null && (
                          <span className="inline-flex items-center gap-1 text-warning">
                            <Check className="size-3" />
                            {spec.higher_is_better
                              ? 'Higher is better'
                              : 'Lower is better'}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground/80">
                          Used in {spec.product_specs_count} product
                          {spec.product_specs_count === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 self-end sm:self-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          setEditingSpec(spec);
                          setIsFormOpen(true);
                          setConfirmDeleteSpec(null);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setConfirmDeleteSpec(spec)}
                        disabled={deletingId === spec.id}
                        aria-label={`Delete spec ${spec.label}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-panel border border-dashed border-border p-8 text-center">
              <Sliders
                className="mx-auto size-8 text-muted-foreground"
                strokeWidth={1}
              />
              <h4 className="mt-2 text-sm font-semibold text-foreground">
                No spec definitions yet
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Define the specs that products in this category share (e.g. RAM,
                Storage, Battery).
              </p>
              {!isFormOpen && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleStartCreate}
                  className="mt-3 gap-1.5"
                >
                  <Plus className="size-4" />
                  Add First Spec
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
