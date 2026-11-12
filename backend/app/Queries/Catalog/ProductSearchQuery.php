<?php

declare(strict_types=1);

namespace App\Queries\Catalog;

use App\Data\Catalog\ProductSearchCriteria;
use App\Data\Catalog\ProductSpecFilter;
use App\Enums\ProductAvailability;
use App\Enums\ProductSort;
use App\Enums\SpecDataType;
use App\Models\Brand;
use App\Models\Product;
use Illuminate\Database\Connection;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Executes public catalog product search, dynamic spec filtering, sorting, and pagination.
 *
 * @phpstan-import-type PreparedSearchTerms from PostgresProductSearch
 */
final class ProductSearchQuery
{
    public function __construct(
        private readonly ActiveCategoryScope $categoryScope,
        private readonly PostgresProductSearch $postgresSearch,
    ) {}

    /**
     * Search, filter, sort, and paginate published products without lazy loading.
     *
     * @return LengthAwarePaginator<int, Product>
     */
    public function search(ProductSearchCriteria $criteria): LengthAwarePaginator
    {
        $categoryIds = $criteria->categorySlug !== null
            ? $this->categoryScope->descendantIdsForSlug($criteria->categorySlug)
            : $this->categoryScope->reachableIds();

        $query = Product::query()
            ->published()
            ->with(['category', 'brand', 'primaryImage'])
            ->whereIn('products.category_id', $categoryIds);

        if ($criteria->brandSlugs !== []) {
            $brandSlugs = $criteria->brandSlugs;
            $query->whereIn(
                'products.brand_id',
                Brand::query()->whereIn('slug', $brandSlugs)->select('id'),
            );
        }

        if ($criteria->priceMin !== null) {
            $query->where('products.price', '>=', $criteria->priceMin);
        }

        if ($criteria->priceMax !== null) {
            $query->where('products.price', '<=', $criteria->priceMax);
        }

        if ($criteria->ratingMin !== null) {
            $query->where('products.rating_avg', '>=', number_format($criteria->ratingMin, 2, '.', ''));
        }

        if ($criteria->availability instanceof ProductAvailability) {
            $query->where('products.availability', $criteria->availability->value);
        }

        foreach ($criteria->specFilters as $specFilter) {
            $this->applySpecFilter($query, $specFilter);
        }

        $normalizedSearch = $criteria->query !== null
            ? trim((string) preg_replace('/\s+/u', ' ', $criteria->query))
            : '';
        $searchTokens = $normalizedSearch !== '' ? $this->tokenize($normalizedSearch) : [];
        $sort = $criteria->resolvedSort();

        $connection = $query->getConnection();
        $isPostgres = $connection instanceof Connection && $connection->getDriverName() === 'pgsql';

        if ($searchTokens !== [] && $isPostgres) {
            return $this->searchWithPostgres(
                baseQuery: $query,
                criteria: $criteria,
                sort: $sort,
                normalizedSearch: $normalizedSearch,
                tokens: $searchTokens,
            );
        }

        if ($searchTokens !== []) {
            $this->applyKeywordFilter($query, $searchTokens);
        }

        $this->applySorting($query, $sort, $normalizedSearch, $searchTokens);

        return $query
            ->paginate(
                perPage: $criteria->perPage,
                page: $criteria->page,
            )
            ->withQueryString();
    }

    /**
     * Run two-stage PostgreSQL search: indexed full-text first, trigram typo fallback when zero rows match.
     *
     * @param  EloquentBuilder<Product>  $baseQuery
     * @param  list<string>  $tokens
     * @return LengthAwarePaginator<int, Product>
     */
    private function searchWithPostgres(
        EloquentBuilder $baseQuery,
        ProductSearchCriteria $criteria,
        ProductSort $sort,
        string $normalizedSearch,
        array $tokens,
    ): LengthAwarePaginator {
        $terms = $this->postgresSearch->prepareTerms($tokens);

        $primaryQuery = clone $baseQuery;
        $this->postgresSearch->applyFullTextFilter($primaryQuery, $terms);
        $this->applySorting($primaryQuery, $sort, $normalizedSearch, $tokens, $terms);

        $paginator = $primaryQuery
            ->paginate(
                perPage: $criteria->perPage,
                page: $criteria->page,
            )
            ->withQueryString();

        if ($paginator->total() > 0 || ! $terms['has_fallback_candidates']) {
            return $paginator;
        }

        $fallbackQuery = clone $baseQuery;
        $this->postgresSearch->applyTrigramFallbackFilter($fallbackQuery, $terms);
        $this->applySorting($fallbackQuery, $sort, $normalizedSearch, $tokens, $terms);

        return $fallbackQuery
            ->paginate(
                perPage: $criteria->perPage,
                page: $criteria->page,
            )
            ->withQueryString();
    }

    /**
     * @param  EloquentBuilder<Product>  $query
     */
    private function applySpecFilter(EloquentBuilder $query, ProductSpecFilter $filter): void
    {
        if ($filter->specDefinitionIds === []) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->whereExists(function (QueryBuilder $subQuery) use ($filter): void {
            $subQuery->selectRaw('1')
                ->from('product_specs')
                ->whereColumn('product_specs.product_id', 'products.id')
                ->whereIn('product_specs.spec_definition_id', $filter->specDefinitionIds);

            match ($filter->dataType) {
                SpecDataType::Number => $this->applyNumericSpecFilter($subQuery, $filter),
                SpecDataType::Boolean => $subQuery
                    ->whereNotNull('product_specs.value_bool')
                    ->where('product_specs.value_bool', '=', $filter->boolValue),
                SpecDataType::Text => $this->applyTextSpecFilter($subQuery, $filter),
            };
        });
    }

    private function applyNumericSpecFilter(QueryBuilder $subQuery, ProductSpecFilter $filter): void
    {
        $subQuery->whereNotNull('product_specs.value_number');

        if ($filter->exactNumber !== null) {
            $subQuery->where('product_specs.value_number', '=', $filter->exactNumber);

            return;
        }

        if ($filter->min !== null) {
            $subQuery->where('product_specs.value_number', '>=', $filter->min);
        }

        if ($filter->max !== null) {
            $subQuery->where('product_specs.value_number', '<=', $filter->max);
        }
    }

    private function applyTextSpecFilter(QueryBuilder $subQuery, ProductSpecFilter $filter): void
    {
        $normalizedValues = array_values(array_unique(array_filter(
            array_map(static fn (string $value): string => mb_strtolower(trim($value)), $filter->textValues),
            static fn (string $value): bool => $value !== '',
        )));

        if ($normalizedValues === []) {
            $subQuery->whereRaw('1 = 0');

            return;
        }

        $placeholders = implode(', ', array_fill(0, count($normalizedValues), '?'));
        $subQuery->whereNotNull('product_specs.value_text')
            ->whereRaw("LOWER(TRIM(product_specs.value_text)) IN ({$placeholders})", $normalizedValues);
    }

    /**
     * @param  EloquentBuilder<Product>  $query
     * @param  list<string>  $tokens
     */
    private function applyKeywordFilter(EloquentBuilder $query, array $tokens): void
    {
        $query->where(function (EloquentBuilder $outer) use ($tokens): void {
            foreach ($tokens as $token) {
                $pattern = '%'.$this->escapeLike($token).'%';

                $outer->where(function (EloquentBuilder $tokenGroup) use ($pattern): void {
                    $tokenGroup
                        ->whereRaw("LOWER(products.name) LIKE ? ESCAPE '!'", [$pattern])
                        ->orWhereRaw("LOWER(products.summary) LIKE ? ESCAPE '!'", [$pattern])
                        ->orWhereRaw("LOWER(products.description) LIKE ? ESCAPE '!'", [$pattern])
                        ->orWhereExists(function (QueryBuilder $brandQuery) use ($pattern): void {
                            $brandQuery->selectRaw('1')
                                ->from('brands')
                                ->whereColumn('brands.id', 'products.brand_id')
                                ->whereRaw("LOWER(brands.name) LIKE ? ESCAPE '!'", [$pattern]);
                        })
                        ->orWhereExists(function (QueryBuilder $categoryQuery) use ($pattern): void {
                            $categoryQuery->selectRaw('1')
                                ->from('categories')
                                ->whereColumn('categories.id', 'products.category_id')
                                ->whereRaw("LOWER(categories.name) LIKE ? ESCAPE '!'", [$pattern]);
                        });
                });
            }
        });
    }

    /**
     * @param  EloquentBuilder<Product>  $query
     * @param  list<string>  $tokens
     * @param  PreparedSearchTerms|null  $postgresTerms
     */
    private function applySorting(
        EloquentBuilder $query,
        ProductSort $sort,
        string $normalizedSearch,
        array $tokens,
        ?array $postgresTerms = null,
    ): void {
        match ($sort) {
            ProductSort::Relevance => $this->applyRelevanceSort($query, $normalizedSearch, $tokens, $postgresTerms),
            ProductSort::PriceAsc => $query
                ->orderBy('products.price')
                ->orderBy('products.id'),
            ProductSort::PriceDesc => $query
                ->orderByDesc('products.price')
                ->orderByDesc('products.id'),
            ProductSort::Rating => $query
                ->orderByDesc('products.rating_avg')
                ->orderByDesc('products.rating_count')
                ->orderByDesc('products.id'),
            ProductSort::Value => $this->applyValueSort($query),
            ProductSort::Newest => $query
                ->orderByDesc('products.created_at')
                ->orderByDesc('products.id'),
        };
    }

    /**
     * @param  EloquentBuilder<Product>  $query
     * @param  list<string>  $tokens
     * @param  PreparedSearchTerms|null  $postgresTerms
     */
    private function applyRelevanceSort(
        EloquentBuilder $query,
        string $normalizedSearch,
        array $tokens,
        ?array $postgresTerms = null,
    ): void {
        if ($normalizedSearch === '' || $tokens === []) {
            $this->applyValueSort($query);

            return;
        }

        if ($postgresTerms !== null) {
            $this->postgresSearch->applyRelevanceOrder($query, $normalizedSearch, $postgresTerms);
            $this->applyValueSort($query);

            return;
        }

        $exactPhrase = mb_strtolower($normalizedSearch);
        $escapedPhrase = $this->escapeLike($exactPhrase);
        $prefixPattern = $escapedPhrase.'%';
        $containsPattern = '%'.$escapedPhrase.'%';

        $scoreParts = [
            'CASE WHEN LOWER(products.name) = ? THEN 100 ELSE 0 END',
            "CASE WHEN LOWER(products.name) LIKE ? ESCAPE '!' THEN 60 ELSE 0 END",
            "CASE WHEN LOWER(products.name) LIKE ? ESCAPE '!' THEN 30 ELSE 0 END",
            "CASE WHEN LOWER(products.summary) LIKE ? ESCAPE '!' THEN 15 ELSE 0 END",
        ];
        $bindings = [$exactPhrase, $prefixPattern, $containsPattern, $containsPattern];

        foreach ($tokens as $token) {
            $tokenPattern = '%'.$this->escapeLike($token).'%';
            $scoreParts[] = "CASE WHEN LOWER(products.name) LIKE ? ESCAPE '!' THEN 5 ELSE 0 END";
            $bindings[] = $tokenPattern;
            $scoreParts[] = "CASE WHEN LOWER(products.summary) LIKE ? ESCAPE '!' THEN 2 ELSE 0 END";
            $bindings[] = $tokenPattern;
        }

        $query->orderByRaw('('.implode(' + ', $scoreParts).') DESC', $bindings);
        $this->applyValueSort($query);
    }

    /**
     * Sort by value_score descending while pushing unscored (NULL) rows last on both Postgres and SQLite.
     *
     * @param  EloquentBuilder<Product>  $query
     */
    private function applyValueSort(EloquentBuilder $query): void
    {
        $query
            ->orderByRaw('CASE WHEN products.value_score IS NULL THEN 1 ELSE 0 END ASC')
            ->orderByDesc('products.value_score')
            ->orderByDesc('products.rating_avg')
            ->orderByDesc('products.rating_count')
            ->orderByDesc('products.id');
    }

    /**
     * @return list<string>
     */
    private function tokenize(string $normalizedSearch): array
    {
        $parts = preg_split('/\s+/u', mb_strtolower($normalizedSearch), -1, PREG_SPLIT_NO_EMPTY);

        if ($parts === false) {
            return [];
        }

        return array_slice(array_values(array_unique($parts)), 0, 10);
    }

    /**
     * Escape LIKE wildcards using `!` so behavior is identical across PostgreSQL and SQLite.
     */
    private function escapeLike(string $value): string
    {
        return str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $value);
    }
}
