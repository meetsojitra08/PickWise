import { AlertCircle, Sliders } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminCategorySpecs } from '../api/admin-api';
import type { AdminSpecDefinition } from '../types';

interface ProductSpecsFormSectionProps {
  categoryId: number | null;
  values: Record<number, string | number | boolean>;
  onChange: (
    specDefinitionId: number,
    value: string | number | boolean | null,
  ) => void;
  disabled?: boolean;
}

export function ProductSpecsFormSection({
  categoryId,
  values,
  onChange,
  disabled = false,
}: ProductSpecsFormSectionProps) {
  const isCategorySelected = categoryId !== null && categoryId > 0;
  const {
    data: specs = [],
    isLoading,
    isError,
  } = useAdminCategorySpecs(isCategorySelected ? categoryId : 0);

  if (!isCategorySelected) {
    return (
      <div className="rounded-control border border-dashed border-border p-4 text-center">
        <p className="text-xs text-muted-foreground">
          Select a category above to configure category-specific technical
          specifications.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sliders className="size-3.5 animate-pulse text-primary" />
          <span>Loading category specifications...</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-control border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
        <AlertCircle className="size-4 shrink-0" />
        <span>Failed to load specifications for the selected category.</span>
      </div>
    );
  }

  if (specs.length === 0) {
    return (
      <div className="rounded-control border border-border bg-muted/20 p-3 text-center">
        <p className="text-xs text-muted-foreground">
          No custom specifications defined for this category. You can add them
          under Categories & Specs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="size-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Category Specifications ({specs.length})
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Powers filter facets and comparison matrices
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {specs.map((spec: AdminSpecDefinition) => {
          const rawVal = values[spec.id];

          return (
            <div
              key={spec.id}
              className="space-y-1.5 rounded-control border border-border/70 bg-card p-3 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor={`spec-input-${spec.id}`}
                  className="text-xs font-medium text-foreground truncate"
                  title={spec.label}
                >
                  {spec.label}
                  {spec.unit && (
                    <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                      ({spec.unit})
                    </span>
                  )}
                </Label>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {spec.data_type}
                </span>
              </div>

              {spec.data_type === 'number' && (
                <Input
                  id={`spec-input-${spec.id}`}
                  type="number"
                  step="any"
                  placeholder={spec.unit ? `e.g. 16 ${spec.unit}` : 'e.g. 16'}
                  value={
                    rawVal !== undefined && rawVal !== null
                      ? String(rawVal)
                      : ''
                  }
                  onChange={(e) => {
                    const str = e.target.value.trim();
                    onChange(spec.id, str === '' ? null : Number(str));
                  }}
                  disabled={disabled}
                  className="h-8 text-xs"
                />
              )}

              {spec.data_type === 'boolean' && (
                <select
                  id={`spec-input-${spec.id}`}
                  value={
                    rawVal === true ||
                    rawVal === 'true' ||
                    rawVal === 1 ||
                    rawVal === '1'
                      ? 'true'
                      : rawVal === false ||
                          rawVal === 'false' ||
                          rawVal === 0 ||
                          rawVal === '0'
                        ? 'false'
                        : ''
                  }
                  onChange={(e) => {
                    const str = e.target.value;
                    if (str === '') {
                      onChange(spec.id, null);
                    } else {
                      onChange(spec.id, str === 'true');
                    }
                  }}
                  disabled={disabled}
                  className="flex h-8 w-full rounded-control border border-input bg-background px-2.5 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Not set / Unspecified</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              )}

              {spec.data_type === 'text' && (
                <Input
                  id={`spec-input-${spec.id}`}
                  type="text"
                  placeholder="e.g. OLED, Titanium, USB-C"
                  value={
                    rawVal !== undefined && rawVal !== null
                      ? String(rawVal)
                      : ''
                  }
                  onChange={(e) => {
                    const str = e.target.value;
                    onChange(spec.id, str.trim() === '' ? null : str);
                  }}
                  disabled={disabled}
                  className="h-8 text-xs"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
