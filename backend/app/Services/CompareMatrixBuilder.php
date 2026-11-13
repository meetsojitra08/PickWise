<?php

declare(strict_types=1);

namespace App\Services;

use App\Data\Compare\CompareMatrix;
use App\Enums\SpecDataType;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductSpec;
use App\Models\SpecDefinition;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Builds the side-by-side specification matrix and per-row winner for a comparison.
 */
final class CompareMatrixBuilder
{
    /**
     * Build the matrix for the given validated product ids, preserving the shopper's order.
     *
     * @param  list<int>  $productIds  Two to four product ids from one category.
     *
     * @throws ModelNotFoundException<Product>
     */
    public function build(array $productIds): CompareMatrix
    {
        /** @var Collection<int, Product> $products */
        $products = Product::query()
            ->published()
            ->whereKey($productIds)
            ->with(['category', 'brand', 'primaryImage', 'specs'])
            ->get()
            ->sortBy(static function (Product $product) use ($productIds): int {
                $position = array_search($product->id, $productIds, true);

                return $position === false ? PHP_INT_MAX : $position;
            })
            ->values();

        $firstProduct = $products->first();
        $category = $firstProduct?->category;

        if ($products->count() !== count($productIds) || ! $category instanceof Category) {
            throw (new ModelNotFoundException)->setModel(Product::class, $productIds);
        }

        /** @var array<int, array<int, ProductSpec>> $specsByProduct */
        $specsByProduct = [];

        foreach ($products as $product) {
            foreach ($product->specs as $spec) {
                $specsByProduct[$product->id][$spec->spec_definition_id] = $spec;
            }
        }

        /** @var Collection<int, SpecDefinition> $definitions */
        $definitions = SpecDefinition::query()
            ->comparable()
            ->where('category_id', $category->id)
            ->ordered()
            ->get();

        $rows = [];

        foreach ($definitions as $definition) {
            $values = [];
            $hasValue = false;

            foreach ($products as $product) {
                $spec = $specsByProduct[$product->id][$definition->id] ?? null;
                $value = $spec instanceof ProductSpec
                    ? $this->typedValue($spec, $definition->data_type)
                    : null;

                $values[] = [
                    'product_id' => $product->id,
                    'value' => $value,
                ];

                $hasValue = $hasValue || $value !== null;
            }

            if (! $hasValue) {
                continue;
            }

            $rows[] = [
                'key' => $definition->key,
                'label' => $definition->label,
                'unit' => $definition->unit,
                'data_type' => $definition->data_type->value,
                'higher_is_better' => $definition->higher_is_better,
                'winner_product_id' => $this->winner($values, $definition),
                'values' => $values,
            ];
        }

        return new CompareMatrix(
            category: $category,
            products: $products,
            rows: $rows,
        );
    }

    private function typedValue(ProductSpec $spec, SpecDataType $dataType): int|float|bool|string|null
    {
        $value = $spec->valueFor($dataType);

        if ($dataType === SpecDataType::Number && is_float($value)) {
            $rounded = round($value, 4);

            return floor($rounded) === $rounded ? (int) $rounded : $rounded;
        }

        return $value;
    }

    /**
     * Pick the single best value in a row. Ties, missing values and specs without a
     * meaningful ordering (text) deliberately produce no highlight.
     *
     * @param  list<array{product_id: int, value: int|float|bool|string|null}>  $values
     */
    private function winner(array $values, SpecDefinition $definition): ?int
    {
        $higherIsBetter = $definition->higher_is_better;

        if ($higherIsBetter === null || $definition->data_type === SpecDataType::Text) {
            return null;
        }

        $bestValue = null;
        /** @var list<int> $bestProductIds */
        $bestProductIds = [];

        foreach ($values as $item) {
            $value = $item['value'];

            if ($value === null) {
                continue;
            }

            if ($bestValue === null) {
                $bestValue = $value;
                $bestProductIds = [$item['product_id']];

                continue;
            }

            $comparison = $this->compare($definition->data_type, $value, $bestValue);

            if ($comparison === 0) {
                $bestProductIds[] = $item['product_id'];
            } elseif (($higherIsBetter && $comparison > 0) || (! $higherIsBetter && $comparison < 0)) {
                $bestValue = $value;
                $bestProductIds = [$item['product_id']];
            }
        }

        return count($bestProductIds) === 1 ? $bestProductIds[0] : null;
    }

    private function compare(SpecDataType $dataType, int|float|bool|string $left, int|float|bool|string $right): int
    {
        return match ($dataType) {
            SpecDataType::Number => (float) $left <=> (float) $right,
            SpecDataType::Boolean => (int) (bool) $left <=> (int) (bool) $right,
            SpecDataType::Text => 0,
        };
    }
}
