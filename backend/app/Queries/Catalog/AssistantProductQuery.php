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

    /**
     * Common aliases and keywords mapped to catalog category slugs.
     *
     * @var array<string, list<string>>
     */
    private const CATEGORY_ALIASES = [
        'laptops' => ['laptop', 'laptops', 'macbook', 'macbooks', 'notebook', 'notebooks'],
        'smartphones' => ['smartphone', 'smartphones', 'phone', 'phones', 'mobile', 'mobiles', 'iphone', 'iphones', 'android'],
        'headphones' => ['headphone', 'headphones', 'earbud', 'earbuds', 'earphone', 'earphones', 'audio', 'tws', 'airpods'],
        'monitors' => ['monitor', 'monitors', 'display', 'displays', 'screen', 'screens'],
        'keyboards' => ['keyboard', 'keyboards'],
        'smartwatches' => ['smartwatch', 'smartwatches', 'watch', 'watches'],
    ];

    public function __construct(
        private readonly ProductSearchQuery $search,
    ) {}

    /**
     * @return list<Product>
     */
    public function candidates(AssistantQuery $query): array
    {
        $categorySlug = $this->resolveCategorySlug($query->categorySlug);

        $paginator = $this->search->search(new ProductSearchCriteria(
            query: $query->hasCategory() ? null : $query->message,
            categorySlug: $categorySlug,
            priceMax: $query->budgetMax,
            sort: $categorySlug !== null ? ProductSort::Value : ProductSort::Relevance,
            perPage: self::CANDIDATE_LIMIT,
        ));

        if ($paginator->total() > 0) {
            $paginator->getCollection()->loadMissing(['specs.specDefinition']);

            return array_values($paginator->items());
        }

        // When a conversational message yields zero strict full-text matches, infer the category
        // from the message text so shoppers are not met with an empty result when asking naturally.
        $inferredCategory = $categorySlug ?? $this->inferCategoryFromMessage($query->message);

        if ($inferredCategory !== null && $inferredCategory !== $categorySlug) {
            $categoryPaginator = $this->search->search(new ProductSearchCriteria(
                query: null,
                categorySlug: $inferredCategory,
                priceMax: $query->budgetMax,
                sort: ProductSort::Value,
                perPage: self::CANDIDATE_LIMIT,
            ));

            if ($categoryPaginator->total() > 0) {
                $categoryPaginator->getCollection()->loadMissing(['specs.specDefinition']);

                return array_values($categoryPaginator->items());
            }
        }

        return [];
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
        $categorySlug = $this->resolveCategorySlug($query->categorySlug)
            ?? $this->inferCategoryFromMessage($query->message);

        $paginator = $this->search->search(new ProductSearchCriteria(
            query: $query->hasCategory() ? null : $query->message,
            categorySlug: $categorySlug,
            priceMin: $budget,
            priceMax: $this->markup($budget),
            sort: ProductSort::PriceAsc,
            perPage: self::ALTERNATIVE_LIMIT * 2,
        ));

        $overBudget = array_filter(
            $paginator->items(),
            static fn (Product $product): bool => Money::compare((string) $product->price, $budget) > 0,
        );

        if ($overBudget === [] && $categorySlug !== null && ! $query->hasCategory()) {
            $categoryPaginator = $this->search->search(new ProductSearchCriteria(
                query: null,
                categorySlug: $categorySlug,
                priceMin: $budget,
                priceMax: $this->markup($budget),
                sort: ProductSort::PriceAsc,
                perPage: self::ALTERNATIVE_LIMIT * 2,
            ));

            $overBudget = array_filter(
                $categoryPaginator->items(),
                static fn (Product $product): bool => Money::compare((string) $product->price, $budget) > 0,
            );
        }

        $selected = array_slice(array_values($overBudget), 0, self::ALTERNATIVE_LIMIT);
        foreach ($selected as $product) {
            $product->loadMissing(['specs.specDefinition']);
        }

        return $selected;
    }

    /**
     * Resolve known category aliases (such as "audio" -> "headphones").
     */
    private function resolveCategorySlug(?string $slug): ?string
    {
        if ($slug === null || trim($slug) === '') {
            return null;
        }

        $normalized = mb_strtolower(trim($slug));

        if ($normalized === 'audio') {
            return 'headphones';
        }

        return $normalized;
    }

    /**
     * Infer target catalog category from natural language shopper prompt.
     */
    private function inferCategoryFromMessage(string $message): ?string
    {
        $normalized = mb_strtolower($message);
        $words = preg_split('/[^a-z0-9]+/i', $normalized, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        foreach (self::CATEGORY_ALIASES as $slug => $aliases) {
            foreach ($aliases as $alias) {
                if (in_array($alias, $words, true)) {
                    return $slug;
                }
            }
        }

        return null;
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
