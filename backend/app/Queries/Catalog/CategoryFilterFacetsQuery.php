<?php

declare(strict_types=1);

namespace App\Queries\Catalog;

use App\Data\Catalog\CategoryFilterFacets;
use App\Enums\ProductAvailability;
use App\Enums\SpecDataType;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\SpecDefinition;
use App\Support\MediaUrl;
use App\Support\Money;
use Illuminate\Database\DatabaseManager;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * @phpstan-import-type MoneyPayload from CategoryFilterFacets
 * @phpstan-import-type BrandFacet from CategoryFilterFacets
 * @phpstan-import-type AvailabilityFacet from CategoryFilterFacets
 * @phpstan-import-type SpecFacet from CategoryFilterFacets
 * @phpstan-import-type SpecOption from CategoryFilterFacets
 */
final class CategoryFilterFacetsQuery
{
    public function __construct(
        private readonly DatabaseManager $database,
    ) {}

    /**
     * Build dynamic filter facets for an active category slug from published products and spec definitions.
     */
    public function forSlug(string $slug): CategoryFilterFacets
    {
        [$category, $categoryIds] = $this->resolveActiveCategoryScope($slug);

        $priceAggregate = $this->fetchPriceAggregate($categoryIds);
        $productsCount = $priceAggregate['products_count'];
        $category->setAttribute('products_count', $productsCount);

        $brands = $productsCount > 0 ? $this->fetchBrands($categoryIds) : [];
        $availability = $this->fetchAvailability($categoryIds, $productsCount);
        $specs = $this->fetchFilterableSpecs($category->id, $categoryIds, $productsCount);

        return new CategoryFilterFacets(
            category: $category,
            productsCount: $productsCount,
            priceRange: [
                'min' => $priceAggregate['min'],
                'max' => $priceAggregate['max'],
            ],
            brands: $brands,
            availability: $availability,
            specs: $specs,
        );
    }

    /**
     * Resolve the active category only if every ancestor is also active, and collect active descendant IDs.
     *
     * @return array{0: Category, 1: list<int>}
     */
    private function resolveActiveCategoryScope(string $slug): array
    {
        /** @var Collection<int, Category> $activeCategories */
        $activeCategories = Category::query()
            ->active()
            ->ordered()
            ->get();

        /** @var array<int, Category> $byId */
        $byId = [];
        /** @var array<int, list<int>> $childIdsByParent */
        $childIdsByParent = [];
        $target = null;

        foreach ($activeCategories as $item) {
            $byId[$item->id] = $item;
            $parentKey = $item->parent_id ?? 0;
            $childIdsByParent[$parentKey][] = $item->id;

            if ($item->slug === $slug) {
                $target = $item;
            }
        }

        if (! $target instanceof Category || ! $this->hasActiveAncestorChain($target, $byId)) {
            throw (new ModelNotFoundException)->setModel(Category::class, [$slug]);
        }

        return [$target, $this->collectDescendantIds($target->id, $childIdsByParent)];
    }

    /**
     * @param  array<int, Category>  $activeById
     */
    private function hasActiveAncestorChain(Category $category, array $activeById): bool
    {
        $visited = [$category->id => true];
        $parentId = $category->parent_id;

        while ($parentId !== null) {
            if (isset($visited[$parentId]) || ! isset($activeById[$parentId])) {
                return false;
            }

            $visited[$parentId] = true;
            $parentId = $activeById[$parentId]->parent_id;
        }

        return true;
    }

    /**
     * @param  array<int, list<int>>  $childIdsByParent
     * @return list<int>
     */
    private function collectDescendantIds(int $rootId, array $childIdsByParent): array
    {
        $ids = [$rootId];
        $queue = [$rootId];

        while ($queue !== []) {
            $currentId = array_shift($queue);

            foreach ($childIdsByParent[$currentId] ?? [] as $childId) {
                $ids[] = $childId;
                $queue[] = $childId;
            }
        }

        return $ids;
    }

    /**
     * @param  list<int>  $categoryIds
     * @return array{products_count: int, min: MoneyPayload|null, max: MoneyPayload|null}
     */
    private function fetchPriceAggregate(array $categoryIds): array
    {
        $row = Product::query()
            ->published()
            ->whereIn('category_id', $categoryIds)
            ->toBase()
            ->selectRaw('COUNT(*) as products_count, MIN(price) as min_price, MAX(price) as max_price, MIN(currency) as currency')
            ->first();

        $rawCount = $row !== null ? ($row->products_count ?? 0) : 0;
        $productsCount = is_numeric($rawCount) ? (int) $rawCount : 0;

        if ($row === null || $productsCount === 0 || $row->min_price === null || $row->max_price === null) {
            return [
                'products_count' => $productsCount,
                'min' => null,
                'max' => null,
            ];
        }

        $currency = is_string($row->currency) && trim($row->currency) !== ''
            ? $row->currency
            : Money::DEFAULT_CURRENCY;

        $minAmount = $this->asNumericScalar($row->min_price);
        $maxAmount = $this->asNumericScalar($row->max_price);

        return [
            'products_count' => $productsCount,
            'min' => $minAmount !== null ? Money::toArray($minAmount, $currency) : null,
            'max' => $maxAmount !== null ? Money::toArray($maxAmount, $currency) : null,
        ];
    }

    /**
     * @param  list<int>  $categoryIds
     * @return list<BrandFacet>
     */
    private function fetchBrands(array $categoryIds): array
    {
        $rows = Brand::query()
            ->join('products', 'products.brand_id', '=', 'brands.id')
            ->whereIn('products.category_id', $categoryIds)
            ->where('products.is_published', true)
            ->whereNull('products.deleted_at')
            ->groupBy(['brands.id', 'brands.name', 'brands.slug', 'brands.logo_path'])
            ->orderByRaw('LOWER(brands.name) ASC')
            ->orderBy('brands.id')
            ->toBase()
            ->selectRaw('brands.id, brands.name, brands.slug, brands.logo_path, COUNT(products.id) as products_count')
            ->get();

        $brands = [];

        foreach ($rows as $row) {
            $id = is_numeric($row->id ?? null) ? (int) $row->id : 0;
            $count = is_numeric($row->products_count ?? null) ? (int) $row->products_count : 0;

            $brands[] = [
                'id' => $id,
                'name' => is_string($row->name ?? null) ? $row->name : '',
                'slug' => is_string($row->slug ?? null) ? $row->slug : '',
                'logo_url' => MediaUrl::fromPublicPath(is_string($row->logo_path ?? null) ? $row->logo_path : null),
                'products_count' => $count,
            ];
        }

        return $brands;
    }

    /**
     * @param  list<int>  $categoryIds
     * @return list<AvailabilityFacet>
     */
    private function fetchAvailability(array $categoryIds, int $productsCount): array
    {
        $counts = [];

        if ($productsCount > 0) {
            $rows = Product::query()
                ->published()
                ->whereIn('category_id', $categoryIds)
                ->groupBy('availability')
                ->toBase()
                ->selectRaw('availability, COUNT(*) as products_count')
                ->get();

            foreach ($rows as $row) {
                $status = is_string($row->availability ?? null) ? $row->availability : '';
                $count = is_numeric($row->products_count ?? null) ? (int) $row->products_count : 0;
                $counts[$status] = $count;
            }
        }

        return array_map(
            static fn (ProductAvailability $case): array => [
                'value' => $case->value,
                'label' => $case->label(),
                'products_count' => $counts[$case->value] ?? 0,
            ],
            ProductAvailability::cases(),
        );
    }

    /**
     * Load filterable spec definitions and populate ranges/options in at most three batched queries.
     *
     * @param  list<int>  $categoryIds
     * @return list<SpecFacet>
     */
    private function fetchFilterableSpecs(int $categoryId, array $categoryIds, int $productsCount): array
    {
        /** @var Collection<int, SpecDefinition> $definitions */
        $definitions = SpecDefinition::query()
            ->where('category_id', $categoryId)
            ->filterable()
            ->ordered()
            ->get();

        if ($definitions->isEmpty()) {
            return [];
        }

        $numericIds = [];
        $booleanIds = [];
        $textIds = [];

        foreach ($definitions as $definition) {
            match ($definition->data_type) {
                SpecDataType::Number => $numericIds[] = $definition->id,
                SpecDataType::Boolean => $booleanIds[] = $definition->id,
                SpecDataType::Text => $textIds[] = $definition->id,
            };
        }

        $numericRanges = ($productsCount > 0 && $numericIds !== [])
            ? $this->fetchNumericRanges($numericIds, $categoryIds)
            : [];
        $booleanOptions = ($productsCount > 0 && $booleanIds !== [])
            ? $this->fetchBooleanOptions($booleanIds, $categoryIds)
            : [];
        $textOptions = ($productsCount > 0 && $textIds !== [])
            ? $this->fetchTextOptions($textIds, $categoryIds)
            : [];

        $facets = [];

        foreach ($definitions as $definition) {
            $base = [
                'key' => $definition->key,
                'label' => $definition->label,
                'unit' => $definition->unit,
                'data_type' => $definition->data_type->value,
            ];

            $facets[] = match ($definition->data_type) {
                SpecDataType::Number => [
                    ...$base,
                    'range' => $numericRanges[$definition->id] ?? ['min' => null, 'max' => null],
                ],
                SpecDataType::Boolean => [
                    ...$base,
                    'options' => $booleanOptions[$definition->id] ?? [],
                ],
                SpecDataType::Text => [
                    ...$base,
                    'options' => $textOptions[$definition->id] ?? [],
                ],
            };
        }

        return $facets;
    }

    /**
     * @param  list<int>  $specDefinitionIds
     * @param  list<int>  $categoryIds
     * @return array<int, array{min: int|float|null, max: int|float|null}>
     */
    private function fetchNumericRanges(array $specDefinitionIds, array $categoryIds): array
    {
        $rows = $this->database->table('product_specs')
            ->join('products', 'products.id', '=', 'product_specs.product_id')
            ->whereIn('product_specs.spec_definition_id', $specDefinitionIds)
            ->whereNotNull('product_specs.value_number')
            ->whereIn('products.category_id', $categoryIds)
            ->where('products.is_published', true)
            ->whereNull('products.deleted_at')
            ->groupBy('product_specs.spec_definition_id')
            ->selectRaw('product_specs.spec_definition_id, MIN(product_specs.value_number) as min_value, MAX(product_specs.value_number) as max_value')
            ->get();

        $ranges = [];

        foreach ($rows as $row) {
            $specId = is_numeric($row->spec_definition_id ?? null) ? (int) $row->spec_definition_id : 0;
            $ranges[$specId] = [
                'min' => $this->normalizeNumber($row->min_value ?? null),
                'max' => $this->normalizeNumber($row->max_value ?? null),
            ];
        }

        return $ranges;
    }

    /**
     * @param  list<int>  $specDefinitionIds
     * @param  list<int>  $categoryIds
     * @return array<int, list<SpecOption>>
     */
    private function fetchBooleanOptions(array $specDefinitionIds, array $categoryIds): array
    {
        $rows = $this->database->table('product_specs')
            ->join('products', 'products.id', '=', 'product_specs.product_id')
            ->whereIn('product_specs.spec_definition_id', $specDefinitionIds)
            ->whereNotNull('product_specs.value_bool')
            ->whereIn('products.category_id', $categoryIds)
            ->where('products.is_published', true)
            ->whereNull('products.deleted_at')
            ->groupBy(['product_specs.spec_definition_id', 'product_specs.value_bool'])
            ->selectRaw('product_specs.spec_definition_id, product_specs.value_bool, COUNT(DISTINCT products.id) as products_count')
            ->get();

        /** @var array<int, array{true?: int, false?: int}> $grouped */
        $grouped = [];

        foreach ($rows as $row) {
            $specId = is_numeric($row->spec_definition_id ?? null) ? (int) $row->spec_definition_id : 0;
            $boolValue = $this->normalizeBool($row->value_bool ?? null);
            $count = is_numeric($row->products_count ?? null) ? (int) $row->products_count : 0;
            $key = $boolValue ? 'true' : 'false';

            $grouped[$specId][$key] = ($grouped[$specId][$key] ?? 0) + $count;
        }

        $optionsBySpec = [];

        foreach ($grouped as $specId => $bucket) {
            $options = [];

            if (isset($bucket['true'])) {
                $options[] = [
                    'value' => true,
                    'label' => 'Yes',
                    'products_count' => $bucket['true'],
                ];
            }

            if (isset($bucket['false'])) {
                $options[] = [
                    'value' => false,
                    'label' => 'No',
                    'products_count' => $bucket['false'],
                ];
            }

            $optionsBySpec[$specId] = $options;
        }

        return $optionsBySpec;
    }

    /**
     * @param  list<int>  $specDefinitionIds
     * @param  list<int>  $categoryIds
     * @return array<int, list<SpecOption>>
     */
    private function fetchTextOptions(array $specDefinitionIds, array $categoryIds): array
    {
        $rows = $this->database->table('product_specs')
            ->join('products', 'products.id', '=', 'product_specs.product_id')
            ->whereIn('product_specs.spec_definition_id', $specDefinitionIds)
            ->whereNotNull('product_specs.value_text')
            ->where('product_specs.value_text', '!=', '')
            ->whereIn('products.category_id', $categoryIds)
            ->where('products.is_published', true)
            ->whereNull('products.deleted_at')
            ->groupBy(['product_specs.spec_definition_id', 'product_specs.value_text'])
            ->selectRaw('product_specs.spec_definition_id, product_specs.value_text, COUNT(DISTINCT products.id) as products_count')
            ->get();

        /** @var array<int, array<string, int>> $grouped */
        $grouped = [];

        foreach ($rows as $row) {
            $specId = is_numeric($row->spec_definition_id ?? null) ? (int) $row->spec_definition_id : 0;
            $rawText = is_string($row->value_text ?? null) ? trim($row->value_text) : '';

            if ($rawText === '') {
                continue;
            }

            $count = is_numeric($row->products_count ?? null) ? (int) $row->products_count : 0;
            $grouped[$specId][$rawText] = ($grouped[$specId][$rawText] ?? 0) + $count;
        }

        $optionsBySpec = [];

        foreach ($grouped as $specId => $values) {
            uksort($values, static function (string $a, string $b): int {
                $natural = strnatcasecmp($a, $b);

                return $natural !== 0 ? $natural : strcmp($a, $b);
            });

            $options = [];

            foreach ($values as $textValue => $count) {
                $options[] = [
                    'value' => $textValue,
                    'label' => $textValue,
                    'products_count' => $count,
                ];
            }

            $optionsBySpec[$specId] = $options;
        }

        return $optionsBySpec;
    }

    private function asNumericScalar(mixed $value): string|int|float|null
    {
        if (is_int($value) || is_float($value) || is_string($value)) {
            return $value;
        }

        return null;
    }

    private function normalizeNumber(mixed $value): int|float|null
    {
        if (! is_int($value) && ! is_float($value) && ! is_string($value)) {
            return null;
        }

        if (! is_numeric($value)) {
            return null;
        }

        $rounded = round((float) $value, 4);

        return floor($rounded) === $rounded ? (int) $rounded : $rounded;
    }

    private function normalizeBool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_int($value) || is_float($value)) {
            return (int) $value !== 0;
        }

        if (is_string($value)) {
            return ! in_array(strtolower(trim($value)), ['', '0', 'f', 'false', 'n', 'no', 'off'], true);
        }

        return (bool) $value;
    }
}
