<?php

declare(strict_types=1);

namespace App\Queries\Catalog;

use App\Models\Product;
use App\Models\ProductSpec;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Loads a single publicly visible product with all detail relations eager-loaded.
 */
final class ProductDetailQuery
{
    public function __construct(
        private readonly ActiveCategoryScope $categoryScope,
    ) {}

    /**
     * Fetch a published product by slug within reachable active categories or throw 404.
     *
     * @throws ModelNotFoundException<Product>
     */
    public function forSlug(string $slug): Product
    {
        $reachableCategoryIds = $this->categoryScope->reachableIds();

        if ($reachableCategoryIds === []) {
            throw (new ModelNotFoundException)->setModel(Product::class, [$slug]);
        }

        return Product::query()
            ->published()
            ->whereIn('category_id', $reachableCategoryIds)
            ->where('slug', $slug)
            ->with([
                'category',
                'brand',
                'primaryImage',
                'images',
                'specs' => static function (HasMany $query): void {
                    /** @var HasMany<ProductSpec, Product> $query */
                    $query->join('spec_definitions', 'spec_definitions.id', '=', 'product_specs.spec_definition_id')
                        ->orderBy('spec_definitions.sort_order')
                        ->orderBy('spec_definitions.id')
                        ->select('product_specs.*')
                        ->with('specDefinition');
                },
            ])
            ->firstOrFail();
    }
}
