import { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  CatalogCategory,
  CatalogFacets,
  CatalogSpecFacet,
} from '@/features/catalog/types/catalog-api';

interface FilterPanelProps {
  categories: CatalogCategory[];
  facets?: CatalogFacets;
  params: URLSearchParams;
  onChange: (key: string, value: string | null) => void;
}

function flattenCategories(categories: CatalogCategory[]): CatalogCategory[] {
  return categories.flatMap((category) => [
    category,
    ...flattenCategories(category.children ?? []),
  ]);
}

export function FilterPanel({
  categories,
  facets,
  params,
  onChange,
}: FilterPanelProps) {
  const flatCategories = useMemo(
    () => flattenCategories(categories),
    [categories],
  );
  const selectedBrands = params
    .getAll('brand[]')
    .concat(params.getAll('brand'));

  const handleSpecOption = (
    spec: CatalogSpecFacet,
    value: string | boolean,
    checked: boolean,
  ) => {
    const key = `spec[${spec.key}]`;
    onChange(key, checked ? String(value) : null);
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3" aria-labelledby="category-filter-title">
        <h2 id="category-filter-title" className="text-sm font-semibold">
          Category
        </h2>
        <select
          aria-label="Category"
          value={params.get('category') ?? ''}
          onChange={(event) => onChange('category', event.target.value || null)}
          className="h-11 w-full rounded-control border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <option value="">All categories</option>
          {flatCategories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </section>

      <section className="space-y-3" aria-labelledby="price-filter-title">
        <h2 id="price-filter-title" className="text-sm font-semibold">
          Price range
        </h2>
        {facets?.price_range.min && facets.price_range.max ? (
          <p className="text-xs text-muted-foreground">
            ₹{facets.price_range.min.amount} – ₹{facets.price_range.max.amount}
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label
              htmlFor="price-min"
              className="mb-1.5 block text-xs text-muted-foreground"
            >
              Minimum
            </Label>
            <Input
              id="price-min"
              inputMode="decimal"
              placeholder="₹ Min"
              value={params.get('price_min') ?? ''}
              onChange={(event) =>
                onChange('price_min', event.target.value || null)
              }
            />
          </div>
          <div>
            <Label
              htmlFor="price-max"
              className="mb-1.5 block text-xs text-muted-foreground"
            >
              Maximum
            </Label>
            <Input
              id="price-max"
              inputMode="decimal"
              placeholder="₹ Max"
              value={params.get('price_max') ?? ''}
              onChange={(event) =>
                onChange('price_max', event.target.value || null)
              }
            />
          </div>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="rating-filter-title">
        <h2 id="rating-filter-title" className="text-sm font-semibold">
          Minimum rating
        </h2>
        <select
          aria-label="Minimum rating"
          value={params.get('rating_min') ?? ''}
          onChange={(event) =>
            onChange('rating_min', event.target.value || null)
          }
          className="h-11 w-full rounded-control border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <option value="">Any rating</option>
          <option value="4">4 stars & up</option>
          <option value="3">3 stars & up</option>
          <option value="2">2 stars & up</option>
        </select>
      </section>

      {facets?.brands.length ? (
        <section className="space-y-3" aria-labelledby="brand-filter-title">
          <h2 id="brand-filter-title" className="text-sm font-semibold">
            Brand
          </h2>
          <div className="space-y-2">
            {facets.brands.map((brand) => (
              <label
                key={brand.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"
              >
                <Checkbox
                  checked={selectedBrands.includes(brand.slug)}
                  onCheckedChange={(checked) =>
                    onChange(
                      `brand:${brand.slug}`,
                      checked === true ? brand.slug : null,
                    )
                  }
                  aria-label={brand.name}
                />
                <span className="flex-1">{brand.name}</span>
                <span className="text-xs text-muted-foreground">
                  {brand.products_count}
                </span>
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {facets?.availability.length ? (
        <section className="space-y-3" aria-labelledby="availability-title">
          <h2 id="availability-title" className="text-sm font-semibold">
            Availability
          </h2>
          <select
            aria-label="Availability"
            value={params.get('availability') ?? ''}
            onChange={(event) =>
              onChange('availability', event.target.value || null)
            }
            className="h-11 w-full rounded-control border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <option value="">Any availability</option>
            {facets.availability.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </section>
      ) : null}

      {facets?.specs.map((spec) => (
        <SpecFilter
          key={spec.key}
          spec={spec}
          params={params}
          onChange={onChange}
          onOption={handleSpecOption}
        />
      ))}
    </div>
  );
}

function SpecFilter({
  spec,
  params,
  onChange,
  onOption,
}: {
  spec: CatalogSpecFacet;
  params: URLSearchParams;
  onChange: (key: string, value: string | null) => void;
  onOption: (
    spec: CatalogSpecFacet,
    value: string | boolean,
    checked: boolean,
  ) => void;
}) {
  const key = `spec[${spec.key}]`;
  const value = params.get(key) ?? '';

  return (
    <section className="space-y-3" aria-labelledby={`spec-${spec.key}`}>
      <h2 id={`spec-${spec.key}`} className="text-sm font-semibold">
        {spec.label}
        {spec.unit ? (
          <span className="ml-1 font-normal text-muted-foreground">
            ({spec.unit})
          </span>
        ) : null}
      </h2>
      {spec.data_type === 'number' ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label
              htmlFor={`${spec.key}-min`}
              className="mb-1.5 block text-xs text-muted-foreground"
            >
              Min
            </Label>
            <Input
              id={`${spec.key}-min`}
              inputMode="decimal"
              placeholder={spec.range?.min?.toString() ?? 'Min'}
              value={value.split(':')[0] ?? ''}
              onChange={(event) =>
                onChange(
                  key,
                  event.target.value
                    ? `${event.target.value}:${value.split(':')[1] ?? ''}`
                    : value.split(':')[1]
                      ? `:${value.split(':')[1]}`
                      : null,
                )
              }
            />
          </div>
          <div>
            <Label
              htmlFor={`${spec.key}-max`}
              className="mb-1.5 block text-xs text-muted-foreground"
            >
              Max
            </Label>
            <Input
              id={`${spec.key}-max`}
              inputMode="decimal"
              placeholder={spec.range?.max?.toString() ?? 'Max'}
              value={value.split(':')[1] ?? ''}
              onChange={(event) =>
                onChange(
                  key,
                  event.target.value
                    ? `${value.split(':')[0] ?? ''}:${event.target.value}`
                    : value.split(':')[0]
                      ? `${value.split(':')[0]}:`
                      : null,
                )
              }
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {spec.options?.map((option) => (
            <label
              key={String(option.value)}
              className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"
            >
              <Checkbox
                checked={value === String(option.value)}
                onCheckedChange={(checked) =>
                  onOption(spec, option.value, checked === true)
                }
                aria-label={option.label}
              />
              <span className="flex-1">{option.label}</span>
              <span className="text-xs text-muted-foreground">
                {option.products_count}
              </span>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
