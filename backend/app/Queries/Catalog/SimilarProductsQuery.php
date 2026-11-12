<?php

declare(strict_types=1);

namespace App\Queries\Catalog;

use App\Enums\SpecDataType;
use App\Models\Product;
use App\Models\ProductSpec;
use App\Models\SpecDefinition;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;

/** Finds same-category products with comparable specs and a reasonably close price. */
final class SimilarProductsQuery
{
    private const float MAX_PRICE_DIFFERENCE_RATIO = 0.5;

    private const int RESULT_LIMIT = 4;

    public function __construct(
        private readonly ProductDetailQuery $productDetail,
        private readonly ActiveCategoryScope $categoryScope,
    ) {}

    /**
     * Return up to four public products ranked by comparable-spec and price similarity.
     * Products need at least one shared comparable spec and must be within 50% of the source price.
     *
     * @return Collection<int, Product>
     *
     * @throws ModelNotFoundException<Product>
     */
    public function forSlug(string $slug): Collection
    {
        $product = $this->productDetail->forSlug($slug);
        $reachableCategoryIds = $this->categoryScope->reachableIds();

        $product->load(['specs.specDefinition']);
        $sourceSpecs = $product->specs
            ->filter(static fn (ProductSpec $spec): bool => $spec->specDefinition?->is_comparable === true)
            ->keyBy('spec_definition_id');

        if ($sourceSpecs->isEmpty() || $product->price <= 0 || ! in_array($product->category_id, $reachableCategoryIds, true)) {
            return collect();
        }

        $candidates = Product::query()
            ->published()
            ->whereIn('category_id', $reachableCategoryIds)
            ->where('category_id', $product->category_id)
            ->where('currency', $product->currency)
            ->whereKeyNot($product->id)
            ->with([
                'category',
                'brand',
                'primaryImage',
                'specs.specDefinition',
            ])
            ->get();

        return $candidates
            ->map(function (Product $candidate) use ($product, $sourceSpecs): array {
                $candidateSpecs = $candidate->specs
                    ->filter(static fn (ProductSpec $spec): bool => $spec->specDefinition?->is_comparable === true)
                    ->keyBy('spec_definition_id');
                $sharedSpecIds = $sourceSpecs->keys()->intersect($candidateSpecs->keys());

                if ($sharedSpecIds->isEmpty()) {
                    return ['product' => $candidate, 'score' => null];
                }

                $specScores = $sharedSpecIds->map(function (int|string $id) use ($sourceSpecs, $candidateSpecs): float {
                    $sourceSpec = $sourceSpecs->get($id);
                    $candidateSpec = $candidateSpecs->get($id);

                    if (! $sourceSpec instanceof ProductSpec || ! $candidateSpec instanceof ProductSpec) {
                        return 0;
                    }

                    return $this->specSimilarity($sourceSpec, $candidateSpec);
                });
                $specScore = $specScores->avg() ?? 0;
                $priceDifference = abs((float) $candidate->price - (float) $product->price) / (float) $product->price;

                if ($priceDifference > self::MAX_PRICE_DIFFERENCE_RATIO) {
                    return ['product' => $candidate, 'score' => null];
                }

                $priceScore = 1 - ($priceDifference / self::MAX_PRICE_DIFFERENCE_RATIO);

                return ['product' => $candidate, 'score' => ($specScore * 0.6) + ($priceScore * 0.4)];
            })
            ->filter(static fn (array $item): bool => $item['score'] !== null)
            ->sort(static function (array $left, array $right): int {
                return ($right['score'] <=> $left['score']) ?: ($left['product']->id <=> $right['product']->id);
            })
            ->take(self::RESULT_LIMIT)
            ->map(static fn (array $item): Product => $item['product'])
            ->values();
    }

    private function specSimilarity(ProductSpec $source, ProductSpec $candidate): float
    {
        $definition = $source->specDefinition;

        if (! $definition instanceof SpecDefinition) {
            return 0;
        }

        $dataType = $definition->data_type;
        $sourceValue = $source->valueFor($dataType);
        $candidateValue = $candidate->valueFor($dataType);

        if ($sourceValue === null || $candidateValue === null) {
            return 0;
        }

        if ($dataType === SpecDataType::Number && is_numeric($sourceValue) && is_numeric($candidateValue)) {
            $largestValue = max(abs((float) $sourceValue), abs((float) $candidateValue), 1);

            return max(0, 1 - (abs((float) $sourceValue - (float) $candidateValue) / $largestValue));
        }

        return $sourceValue === $candidateValue ? 1 : 0;
    }
}
