<?php

declare(strict_types=1);

namespace App\Data\Catalog;

use App\Models\Category;

/**
 * Typed data transfer object holding computed filter facets for a category.
 *
 * @phpstan-type MoneyPayload array{amount: string, currency: string}
 * @phpstan-type BrandFacet array{id: int, name: string, slug: string, logo_url: ?string, products_count: int}
 * @phpstan-type AvailabilityFacet array{value: string, label: string, products_count: int}
 * @phpstan-type SpecOption array{value: string|bool, label: string, products_count: int}
 * @phpstan-type SpecRange array{min: int|float|null, max: int|float|null}
 * @phpstan-type SpecFacet array{
 *     key: string,
 *     label: string,
 *     unit: ?string,
 *     data_type: string,
 *     range?: SpecRange,
 *     options?: list<SpecOption>
 * }
 */
final readonly class CategoryFilterFacets
{
    /**
     * @param  array{min: MoneyPayload|null, max: MoneyPayload|null}  $priceRange
     * @param  list<BrandFacet>  $brands
     * @param  list<AvailabilityFacet>  $availability
     * @param  list<SpecFacet>  $specs
     */
    public function __construct(
        public Category $category,
        public int $productsCount,
        public array $priceRange,
        public array $brands,
        public array $availability,
        public array $specs,
    ) {}
}
