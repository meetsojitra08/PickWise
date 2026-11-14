<?php

declare(strict_types=1);

namespace App\Queries\Catalog;

use App\Data\Assistant\AssistantQuery;
use App\Data\Catalog\ProductSearchCriteria;
use App\Enums\ProductSort;
use App\Models\Product;
use App\Support\Money;

/**
 * Selects the only products the assistant may recommend: published, in the
 * chosen category (or matching the message), and inside the shopper's budget.
 */
final class AssistantProductQuery
{
    public const CANDIDATE_LIMIT = 12;

    public const ALTERNATIVE_LIMIT = 3;

    private const ALTERNATIVE_MARKUP_PERCENT = 115;

    public function __construct(
        private readonly ProductSearchQuery $search,
    ) {}

    /**
     * @return list<Product>
     */
    public function candidates(AssistantQuery $query): array
    {
        $paginator = $this->search->search(new ProductSearchCriteria(
            query: $query->hasCategory() ? null : $query->message,
            categorySlug: $query->categorySlug,
            priceMax: $query->budgetMax,
            sort: $query->hasCategory() ? ProductSort::Value : ProductSort::Relevance,
            perPage: self::CANDIDATE_LIMIT,
        ));

        $paginator->getCollection()->loadMissing(['specs.specDefinition']);

        return array_values($paginator->items());
    }

    /**
     * Return the cheapest products up to 15% over budget, clearly separated from
     * products the shopper can actually afford.
     *
     * @return list<Product>
     */
    public function alternatives(AssistantQuery $query): array
    {
        if (! $query->hasBudget()) {
            return [];
        }

        $budget = (string) $query->budgetMax;

        $paginator = $this->search->search(new ProductSearchCriteria(
            query: $query->hasCategory() ? null : $query->message,
            categorySlug: $query->categorySlug,
            priceMin: $budget,
            priceMax: $this->markup($budget),
            sort: ProductSort::PriceAsc,
            perPage: self::ALTERNATIVE_LIMIT * 2,
        ));

        $paginator->getCollection()->loadMissing(['specs.specDefinition']);

        $overBudget = array_filter(
            $paginator->items(),
            static fn (Product $product): bool => Money::compare((string) $product->price, $budget) > 0,
        );

        return array_slice(array_values($overBudget), 0, self::ALTERNATIVE_LIMIT);
    }

    /**
     * Compute the 15% ceiling in minor units so money never passes through a float.
     */
    private function markup(string $budget): string
    {
        [$whole, $fraction] = explode('.', Money::normalizeAmount($budget), 2);
        $minorUnits = ((int) $whole * 100) + (int) $fraction;
        $ceilingMinorUnits = intdiv($minorUnits * self::ALTERNATIVE_MARKUP_PERCENT, 100);

        return sprintf('%d.%02d', intdiv($ceilingMinorUnits, 100), $ceilingMinorUnits % 100);
    }
}
