<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Product;
use App\Services\CatalogFacetCacheService;

/**
 * Invalidates catalog filter facet caches whenever product attributes,
 * category assignment, pricing, or visibility change.
 */
final class ProductObserver
{
    public function __construct(
        private readonly CatalogFacetCacheService $facetCache,
    ) {}

    public function saved(Product $product): void
    {
        $this->facetCache->forgetForCategory($product->category_id);

        if ($product->wasChanged('category_id')) {
            $rawOldCategory = $product->getRawOriginal('category_id');
            if (is_numeric($rawOldCategory)) {
                $this->facetCache->forgetForCategory((int) $rawOldCategory);
            }
        }
    }

    public function deleted(Product $product): void
    {
        $this->facetCache->forgetForCategory($product->category_id);
    }

    public function restored(Product $product): void
    {
        $this->facetCache->forgetForCategory($product->category_id);
    }
}
