<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\SpecDefinition;
use App\Services\CatalogFacetCacheService;

/**
 * Invalidates catalog filter facet caches whenever spec definitions
 * are added, modified, or removed from a category.
 */
final class SpecDefinitionObserver
{
    public function __construct(
        private readonly CatalogFacetCacheService $facetCache,
    ) {}

    public function saved(SpecDefinition $spec): void
    {
        $this->facetCache->forgetForCategory($spec->category_id);

        if ($spec->wasChanged('category_id')) {
            $rawOldCategory = $spec->getRawOriginal('category_id');
            if (is_numeric($rawOldCategory)) {
                $this->facetCache->forgetForCategory((int) $rawOldCategory);
            }
        }
    }

    public function deleted(SpecDefinition $spec): void
    {
        $this->facetCache->forgetForCategory($spec->category_id);
    }
}
