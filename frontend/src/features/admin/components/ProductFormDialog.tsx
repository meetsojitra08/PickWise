import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Check, Loader2, Package } from 'lucide-react';
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
import {
  createAdminProduct,
  updateAdminProduct,
  useAdminBrands,
  useAdminCategories,
} from '../api/admin-api';
import { ProductSpecsFormSection } from './ProductSpecsFormSection';
import type { AdminProduct, AdminProductFormData } from '../types';

const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(200, 'Name cannot exceed 200 characters.'),
  slug: z
    .string()
    .trim()
    .max(255, 'Slug cannot exceed 255 characters.')
    .regex(
      /^[a-z0-9]*(?:-[a-z0-9]+)*$/,
      'Slug must contain lowercase alphanumeric characters and single hyphens.',
    )
    .optional()
    .or(z.literal('')),
  category_id: z.string().min(1, 'Please select a category.'),
  brand_id: z.string().min(1, 'Please select a brand.'),
  summary: z
    .string()
    .trim()
    .min(2, 'Summary must be at least 2 characters.')
    .max(300, 'Summary cannot exceed 300 characters.'),
  description: z
    .string()
    .trim()
    .min(2, 'Description must be at least 2 characters.'),
  price: z
    .string()
    .trim()
    .min(1, 'Price is required.')
    .refine((val) => {
      const num = Number(val);
      return !isNaN(num) && num > 0;
    }, 'Price must be a positive number greater than 0.'),
  availability: z.enum([
    'in_stock',
    'out_of_stock',
    'preorder',
    'discontinued',
  ]),
  store_url: z
    .string()
    .trim()
    .url('Store URL must be a valid URL starting with http:// or https://')
    .max(2048, 'Store URL cannot exceed 2048 characters.')
    .optional()
    .or(z.literal('')),
  is_published: z.boolean(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: AdminProduct | null;
  onSuccess: () => void;
}

function extractInitialSpecs(
  product: AdminProduct | null,
): Record<number, string | number | boolean> {
  const initialSpecs: Record<number, string | number | boolean> = {};
  if (product?.specs) {
    for (const spec of product.specs) {
      if (spec.value !== null && spec.value !== undefined) {
        initialSpecs[spec.spec_definition_id] = spec.value;
      }
    }
  }
  return initialSpecs;
}

interface ProductFormContentProps {
  product: AdminProduct | null;
  onClose: () => void;
  onSuccess: () => void;
}

function ProductFormContent({
  product,
  onClose,
  onSuccess,
}: ProductFormContentProps) {
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [specValues, setSpecValues] = useState<
    Record<number, string | number | boolean>
  >(() => extractInitialSpecs(product));

  const isEditing = Boolean(product);

  const { data: categoriesData } = useAdminCategories({ per_page: 100 });
  const { data: brandsData } = useAdminBrands({ per_page: 100 });

  const categories = categoriesData?.data ?? [];
  const brands = brandsData?.data ?? [];

  const defaultValues: ProductFormValues = useMemo(
    () => ({
      name: product?.name ?? '',
      slug: product?.slug ?? '',
      category_id: product?.category_id ? String(product.category_id) : '',
      brand_id: product?.brand_id ? String(product.brand_id) : '',
      summary: product?.summary ?? '',
      description: product?.description ?? '',
      price: product?.price?.amount ? String(product.price.amount) : '',
      availability: product?.availability ?? 'in_stock',
      store_url: product?.store_url ?? '',
      is_published: product?.is_published ?? true,
    }),
    [product],
  );

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    values: defaultValues,
  });

  const selectedCategoryId = useWatch({ control, name: 'category_id' });
  const isPublished = useWatch({ control, name: 'is_published' });
  const currentSummary = useWatch({ control, name: 'summary' }) ?? '';

  function handleSpecChange(
    specDefinitionId: number,
    value: string | number | boolean | null,
  ): void {
    setSpecValues((prev) => {
      const next = { ...prev };
      if (value === null || value === '') {
        delete next[specDefinitionId];
      } else {
        next[specDefinitionId] = value;
      }
      return next;
    });
  }

  async function onSubmit(values: ProductFormValues): Promise<void> {
    setSubmitting(true);
    setServerError(null);

    const formattedSpecs = Object.entries(specValues).map(([idStr, val]) => ({
      spec_definition_id: Number(idStr),
      value: val,
    }));

    const payload: AdminProductFormData = {
      name: values.name.trim(),
      slug: values.slug?.trim() || undefined,
      category_id: Number(values.category_id),
      brand_id: Number(values.brand_id),
      summary: values.summary.trim(),
      description: values.description.trim(),
      price: Number(values.price),
      availability: values.availability,
      store_url: values.store_url?.trim() || undefined,
      is_published: values.is_published,
      specs: formattedSpecs,
    };

    try {
      if (isEditing && product) {
        await updateAdminProduct(product.id, payload);
        toast.success(`Product "${payload.name}" updated.`);
      } else {
        await createAdminProduct(payload);
        toast.success(`Product "${payload.name}" created.`);
      }

      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldErrors = err.getFieldErrors();
        if (Object.keys(fieldErrors).length > 0) {
          let hasMapped = false;
          for (const [key, messages] of Object.entries(fieldErrors)) {
            const firstMsg = messages[0];
            if (key in values) {
              setError(key as keyof ProductFormValues, {
                type: 'server',
                message: firstMsg,
              });
              hasMapped = true;
            }
          }
          if (!hasMapped) {
            setServerError(err.message || 'Validation failed.');
          }
        } else {
          setServerError(err.message);
        }
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('An unexpected error occurred while saving.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <Package className="size-5 text-primary" />
          <DialogTitle>
            {isEditing ? 'Edit product' : 'Add new product'}
          </DialogTitle>
        </div>
        <DialogDescription>
          {isEditing
            ? `Update pricing, catalog details, and specs for "${product?.name}".`
            : 'Add a new product with brand, pricing, and category-specific specs.'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">
        {serverError && (
          <div className="flex items-center gap-2 rounded-control border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Primary Details */}
        <div className="space-y-4 rounded-control border border-border p-4 bg-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Basic information
          </span>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="product-name">
                Product name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="product-name"
                placeholder="e.g. Dell XPS 15 (2026)"
                {...register('name')}
                disabled={submitting}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="product-slug">Slug (auto-slugged if empty)</Label>
              <Input
                id="product-slug"
                placeholder="e.g. dell-xps-15-2026"
                {...register('slug')}
                disabled={submitting}
              />
              {errors.slug && (
                <p className="text-xs text-destructive">
                  {errors.slug.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="product-category">
                Category <span className="text-destructive">*</span>
              </Label>
              <select
                id="product-category"
                {...register('category_id')}
                disabled={submitting}
                className="flex h-10 w-full rounded-control border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <p className="text-xs text-destructive">
                  {errors.category_id.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="product-brand">
                Brand <span className="text-destructive">*</span>
              </Label>
              <select
                id="product-brand"
                {...register('brand_id')}
                disabled={submitting}
                className="flex h-10 w-full rounded-control border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select brand...</option>
                {brands.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name}
                  </option>
                ))}
              </select>
              {errors.brand_id && (
                <p className="text-xs text-destructive">
                  {errors.brand_id.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Pricing & Availability */}
        <div className="space-y-4 rounded-control border border-border p-4 bg-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pricing & status
          </span>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="product-price">
                Price ($) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="product-price"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="999.00"
                {...register('price')}
                disabled={submitting}
              />
              {errors.price && (
                <p className="text-xs text-destructive">
                  {errors.price.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="product-availability">Availability</Label>
              <select
                id="product-availability"
                {...register('availability')}
                disabled={submitting}
                className="flex h-10 w-full rounded-control border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="in_stock">In stock</option>
                <option value="out_of_stock">Out of stock</option>
                <option value="preorder">Pre-order</option>
                <option value="discontinued">Discontinued</option>
              </select>
              {errors.availability && (
                <p className="text-xs text-destructive">
                  {errors.availability.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="product-store-url">Store URL</Label>
              <Input
                id="product-store-url"
                placeholder="https://example.com/store/item"
                {...register('store_url')}
                disabled={submitting}
              />
              {errors.store_url && (
                <p className="text-xs text-destructive">
                  {errors.store_url.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="product-is-published"
              checked={isPublished}
              onCheckedChange={(checked) =>
                register('is_published').onChange({
                  target: { name: 'is_published', value: Boolean(checked) },
                })
              }
              disabled={submitting}
            />
            <Label
              htmlFor="product-is-published"
              className="text-sm font-medium cursor-pointer"
            >
              Publish immediately to catalog
            </Label>
          </div>
        </div>

        {/* Descriptions */}
        <div className="space-y-4 rounded-control border border-border p-4 bg-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Copy & descriptions
          </span>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="product-summary">
                Summary <span className="text-destructive">*</span>
              </Label>
              <span className="text-[11px] text-muted-foreground">
                {currentSummary.length}/300 chars
              </span>
            </div>
            <Input
              id="product-summary"
              placeholder="One-sentence headline for card previews and search snippets..."
              {...register('summary')}
              disabled={submitting}
            />
            {errors.summary && (
              <p className="text-xs text-destructive">
                {errors.summary.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="product-description">
              Full description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="product-description"
              rows={4}
              placeholder="Detailed product features, design notes, and hardware summary..."
              {...register('description')}
              disabled={submitting}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>
        </div>

        {/* Dynamic Specifications */}
        <div className="rounded-control border border-border p-4 bg-card">
          <ProductSpecsFormSection
            categoryId={selectedCategoryId ? Number(selectedCategoryId) : null}
            values={specValues}
            onChange={handleSpecChange}
            disabled={submitting}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="gap-1.5">
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="size-4" />
                {isEditing ? 'Save changes' : 'Create product'}
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: ProductFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        {open && (
          <ProductFormContent
            key={product?.id ?? 'new'}
            product={product}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
