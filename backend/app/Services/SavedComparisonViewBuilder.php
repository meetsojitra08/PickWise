<?php

declare(strict_types=1);

namespace App\Services;

use App\Data\Compare\SavedComparisonView;
use App\Models\Comparison;
use App\Models\ComparisonItem;
use App\Models\Product;
use App\Queries\Catalog\ActiveCategoryScope;
use Illuminate\Database\Eloquent\Collection;

/**
 * Resolves a saved comparison against the live catalog, hiding products that can
 * no longer be viewed while keeping the saved order for the rest.
 */
final class SavedComparisonViewBuilder
{
    public function __construct(
        private readonly ActiveCategoryScope $categoryScope,
        private readonly CompareMatrixBuilder $matrixBuilder,
    ) {}

    public function build(Comparison $comparison): SavedComparisonView
    {
        $comparison->loadMissing([
            'items.product.category',
            'items.product.brand',
            'items.product.primaryImage',
        ]);

        $reachableCategoryIds = array_flip($this->categoryScope->reachableIds());

        /** @var Collection<int, Product> $products */
        $products = $comparison->items
            ->filter(static function (ComparisonItem $item) use ($reachableCategoryIds): bool {
                $product = $item->product;

                return $product instanceof Product
                    && $product->is_published
                    && isset($reachableCategoryIds[$product->category_id]);
            })
            ->map(static fn (ComparisonItem $item): ?Product => $item->product)
            ->filter(static fn (?Product $product): bool => $product instanceof Product)
            ->values();

        $productIds = $products->map(static fn (Product $product): int => $product->id)->all();

        $matrix = count($productIds) >= 2
            ? $this->matrixBuilder->build($productIds)
            : null;

        return new SavedComparisonView(
            comparison: $comparison,
            products: $products,
            matrix: $matrix,
            unavailableCount: max(0, $comparison->items->count() - $products->count()),
        );
    }
}
