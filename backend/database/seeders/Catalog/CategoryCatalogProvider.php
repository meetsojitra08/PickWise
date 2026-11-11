<?php

declare(strict_types=1);

namespace Database\Seeders\Catalog;

use App\Enums\ProductAvailability;
use App\Enums\SpecDataType;

/**
 * Contract for deterministic, per-category showcase seed definitions.
 *
 * @phpstan-type SpecDefinitionSeed array{
 *     key: string,
 *     label: string,
 *     unit: ?string,
 *     data_type: SpecDataType,
 *     is_filterable: bool,
 *     is_comparable: bool,
 *     higher_is_better: ?bool,
 *     sort_order: int,
 * }
 * @phpstan-type ProductSeed array{
 *     slug: string,
 *     name: string,
 *     brand_slug: string,
 *     summary: string,
 *     description: string,
 *     price_rupees: int,
 *     availability: ProductAvailability,
 *     rating_avg: float,
 *     rating_count: int,
 *     price_profile: string,
 *     specs: array<string, float|int|bool|string>,
 * }
 */
interface CategoryCatalogProvider
{
    public function categorySlug(): string;

    /**
     * @return list<SpecDefinitionSeed>
     */
    public function specDefinitions(): array;

    /**
     * @return list<ProductSeed>
     */
    public function products(): array;
}
