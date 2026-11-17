import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api-client';
import { createAdminCategory, updateAdminCategory } from '../api/admin-api';
import type { AdminCategory, AdminCategoryFormData } from '../types';

const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(120, 'Name cannot exceed 120 characters.'),
  slug: z
    .string()
    .trim()
    .max(140, 'Slug cannot exceed 140 characters.')
    .regex(
      /^[a-z0-9]*(?:-[a-z0-9]+)*$/,
      'Slug must contain lowercase alphanumeric characters and single hyphens.',
    )
    .optional()
    .or(z.literal('')),
  parent_id: z.string().optional(),
  description: z
    .string()
    .trim()
    .max(2000, 'Description cannot exceed 2000 characters.')
    .optional(),
  sort_order: z.number().min(0, 'Sort order must be 0 or greater.'),
  is_active: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: AdminCategory | null;
  parentOptions: AdminCategory[];
  onSuccess: () => void;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  parentOptions,
  onSuccess,
}: CategoryFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const isEditing = Boolean(category);

  const defaultValues: CategoryFormValues = useMemo(
    () => ({
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      parent_id: category?.parent_id ? String(category.parent_id) : '',
      description: category?.description ?? '',
      sort_order: category?.sort_order ?? 0,
      is_active: category?.is_active ?? true,
    }),
    [category],
  );

  const {
    register,
    handleSubmit,
    setError,
    control,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    values: defaultValues,
  });

  const isActive = useWatch({ control, name: 'is_active' });

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      setServerError(null);
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: CategoryFormValues): Promise<void> {
    setSubmitting(true);
    setServerError(null);

    const payload: AdminCategoryFormData = {
      name: values.name.trim(),
      slug: values.slug?.trim() ? values.slug.trim() : undefined,
      parent_id: values.parent_id ? Number(values.parent_id) : null,
      description: values.description?.trim()
        ? values.description.trim()
        : undefined,
      sort_order: values.sort_order,
      is_active: values.is_active,
    };

    try {
      if (category) {
        await updateAdminCategory(category.id, payload);
        toast.success(`Category "${payload.name}" updated successfully.`);
      } else {
        await createAdminCategory(payload);
        toast.success(`Category "${payload.name}" created successfully.`);
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        const details = (error.details ?? {}) as Record<string, string[]>;
        let hasFieldErrors = false;

        Object.entries(details).forEach(([field, messages]) => {
          if (field in values && messages && messages.length > 0) {
            setError(field as keyof CategoryFormValues, {
              type: 'server',
              message: messages[0],
            });
            hasFieldErrors = true;
          }
        });

        if (!hasFieldErrors) {
          setServerError(
            error.message || 'Validation failed. Please review your entries.',
          );
        }
      } else {
        setServerError(
          'An unexpected error occurred while saving the category.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Filter out the category itself and its children from parent options
  const eligibleParents = parentOptions.filter(
    (item) => !category || item.id !== category.id,
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Category' : 'Create Category'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update category settings, hierarchy, or visibility.'
              : 'Add a new product category to the Pickwise catalog.'}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div
            role="alert"
            className="rounded-control border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
          >
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="category-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="category-name"
              placeholder="e.g. Mechanical Keyboards"
              {...register('name')}
              aria-invalid={Boolean(errors.name)}
              disabled={submitting}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="category-slug">
                Slug{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  (Optional)
                </span>
              </Label>
              <Input
                id="category-slug"
                placeholder="auto-generated-if-empty"
                {...register('slug')}
                aria-invalid={Boolean(errors.slug)}
                disabled={submitting}
              />
              {errors.slug && (
                <p className="text-xs text-destructive">
                  {errors.slug.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category-parent">Parent Category</Label>
              <select
                id="category-parent"
                {...register('parent_id')}
                disabled={submitting}
                className="flex h-10 w-full rounded-control border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">None (Top-level Root)</option>
                {eligibleParents.map((parent) => (
                  <option key={parent.id} value={String(parent.id)}>
                    {parent.name}
                  </option>
                ))}
              </select>
              {errors.parent_id && (
                <p className="text-xs text-destructive">
                  {errors.parent_id.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category-description">Description</Label>
            <Textarea
              id="category-description"
              rows={3}
              placeholder="Brief summary of products in this category..."
              {...register('description')}
              disabled={submitting}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="category-sort-order">Sort Order</Label>
              <Input
                id="category-sort-order"
                type="number"
                min={0}
                {...register('sort_order', { valueAsNumber: true })}
                aria-invalid={Boolean(errors.sort_order)}
                disabled={submitting}
              />
              {errors.sort_order && (
                <p className="text-xs text-destructive">
                  {errors.sort_order.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="category-is-active"
                checked={isActive}
                onCheckedChange={(checked) =>
                  setValue('is_active', Boolean(checked))
                }
                disabled={submitting}
              />
              <Label
                htmlFor="category-is-active"
                className="cursor-pointer text-sm font-medium"
              >
                Active in storefront
              </Label>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? 'Saving...'
                : isEditing
                  ? 'Update Category'
                  : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
