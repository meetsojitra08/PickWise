<?php

declare(strict_types=1);

namespace App\Data\Catalog;

use App\Enums\ProductAvailability;
use App\Enums\ProductSort;

/**
 * Typed search, filter, sort, and pagination parameters for catalog product queries.
 */
final readonly class ProductSearchCriteria
{
    public const DEFAULT_PER_PAGE = 24;

    public const MAX_PER_PAGE = 48;

    /**
     * @param  list<string>  $brandSlugs
     * @param  list<ProductSpecFilter>  $specFilters
     */
    public function __construct(
        public ?string $query = null,
        public ?string $categorySlug = null,
        public array $brandSlugs = [],
        public ?string $priceMin = null,
        public ?string $priceMax = null,
        public ?float $ratingMin = null,
        public ?ProductAvailability $availability = null,
        public array $specFilters = [],
        public ?ProductSort $sort = null,
        public int $page = 1,
        public int $perPage = self::DEFAULT_PER_PAGE,
    ) {}

    /**
     * Default sort is relevance when a search query is present, otherwise value.
     */
    public function resolvedSort(): ProductSort
    {
        if ($this->sort instanceof ProductSort) {
            return $this->sort;
        }

        return $this->query !== null ? ProductSort::Relevance : ProductSort::Value;
    }
}
