<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Category;
use App\Services\CatalogFacetCacheService;

/**
 * Invalidates catalog filter facet caches whenever category definitions,
 * slugs, active statuses, or hierarchy relationships change.
 */
final class CategoryObserver
{
    public function __construct(
        private readonly CatalogFacetCacheService $facetCache,
    ) {}

    public function saved(Category $category): void
    {
        $this->facetCache->forgetForCategory($category);

        if ($category->wasChanged('slug')) {
            $rawOldSlug = $category->getRawOriginal('slug');
            if (is_string($rawOldSlug) && $rawOldSlug !== '') {
                $this->facetCache->forget($rawOldSlug);
            }
        }

        if ($category->wasChanged('parent_id') || $category->wasChanged('is_active')) {
            $this->facetCache->flush();
        }
    }

    public function deleted(Category $category): void
    {
        $this->facetCache->flush();
    }
}
