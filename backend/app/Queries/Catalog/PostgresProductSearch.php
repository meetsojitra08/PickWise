<?php

declare(strict_types=1);

namespace App\Queries\Catalog;

use App\Models\Product;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;

/**
 * Builds PostgreSQL full-text (tsvector + unaccent) and trigram (pg_trgm) search clauses.
 *
 * @phpstan-type SearchTokenGroup array{raw: string, words: list<string>}
 * @phpstan-type PreparedSearchTerms array{
 *     wildcard_tokens: list<string>,
 *     fts_words: list<string>,
 *     token_groups: list<SearchTokenGroup>,
 *     trigram_words: list<string>,
 *     has_fallback_candidates: bool
 * }
 */
final class PostgresProductSearch
{
    public const int TRIGRAM_MIN_LENGTH = 3;

    public const float TRIGRAM_THRESHOLD = 0.35;

    public const float TRIGRAM_SUMMARY_THRESHOLD = 0.40;

    private const int MAX_FTS_WORDS = 12;

    private const int MAX_TRIGRAM_SCORED_WORDS = 5;

    private const string RANK_WEIGHTS = '{0.1, 0.2, 0.6, 1.0}';

    /**
     * Classify whitespace-normalized search tokens into literal wildcard tokens, FTS words, and trigram candidates.
     *
     * @param  list<string>  $tokens
     * @return PreparedSearchTerms
     */
    public function prepareTerms(array $tokens): array
    {
        $wildcardTokens = [];
        $symbolOnlyTokens = [];
        $ftsWords = [];
        $tokenGroups = [];
        $trigramWords = [];
        $seenFtsWords = [];
        $seenTrigramWords = [];

        foreach ($tokens as $token) {
            if ($this->containsLikeWildcard($token)) {
                $wildcardTokens[] = $token;

                continue;
            }

            $words = $this->extractAlnumWords($token);

            if ($words === []) {
                $symbolOnlyTokens[] = $token;

                continue;
            }

            $tokenGroups[] = [
                'raw' => $token,
                'words' => $words,
            ];

            foreach ($words as $word) {
                if (! isset($seenFtsWords[$word]) && count($ftsWords) < self::MAX_FTS_WORDS) {
                    $seenFtsWords[$word] = true;
                    $ftsWords[] = $word;
                }

                if (
                    mb_strlen($word) >= self::TRIGRAM_MIN_LENGTH
                    && ! isset($seenTrigramWords[$word])
                    && count($trigramWords) < self::MAX_TRIGRAM_SCORED_WORDS
                ) {
                    $seenTrigramWords[$word] = true;
                    $trigramWords[] = $word;
                }
            }
        }

        // Only treat standalone punctuation (e.g. "???") as literal search terms when no alphanumeric words exist.
        if ($wildcardTokens === [] && $ftsWords === [] && $symbolOnlyTokens !== []) {
            $wildcardTokens = $symbolOnlyTokens;
        }

        return [
            'wildcard_tokens' => $wildcardTokens,
            'fts_words' => $ftsWords,
            'token_groups' => $tokenGroups,
            'trigram_words' => $trigramWords,
            'has_fallback_candidates' => $trigramWords !== [] || $ftsWords !== [],
        ];
    }

    /**
     * Apply Stage 1 high-precision GIN-backed full-text search and literal wildcard filtering.
     *
     * @param  EloquentBuilder<Product>  $query
     * @param  PreparedSearchTerms  $terms
     */
    public function applyFullTextFilter(EloquentBuilder $query, array $terms): void
    {
        foreach ($terms['wildcard_tokens'] as $wildcardToken) {
            $this->applyLiteralTokenFilter($query, $wildcardToken);
        }

        if ($terms['fts_words'] === []) {
            return;
        }

        [$tsQuerySql, $bindings] = $this->buildPrefixTsQueryExpression($terms['fts_words']);
        $query->whereRaw("products.search_vector @@ {$tsQuerySql}", $bindings);
    }

    /**
     * Apply Stage 2 trigram typo-tolerant fallback across product name, summary, brand, and category.
     *
     * @param  EloquentBuilder<Product>  $query
     * @param  PreparedSearchTerms  $terms
     */
    public function applyTrigramFallbackFilter(EloquentBuilder $query, array $terms): void
    {
        foreach ($terms['wildcard_tokens'] as $wildcardToken) {
            $this->applyLiteralTokenFilter($query, $wildcardToken);
        }

        $query->where(function (EloquentBuilder $outer) use ($terms): void {
            foreach ($terms['token_groups'] as $group) {
                $outer->where(function (EloquentBuilder $groupQuery) use ($group): void {
                    foreach ($group['words'] as $word) {
                        $this->applyWordFallbackFilter($groupQuery, $word, $group['raw']);
                    }
                });
            }
        });
    }

    /**
     * Order PostgreSQL search results by exact phrase boosts, weighted FTS rank, and thresholded trigram similarity.
     *
     * @param  EloquentBuilder<Product>  $query
     * @param  PreparedSearchTerms  $terms
     */
    public function applyRelevanceOrder(EloquentBuilder $query, string $normalizedSearch, array $terms): void
    {
        $exactPhrase = mb_strtolower($normalizedSearch);
        $escapedPhrase = $this->escapeLike($exactPhrase);
        $prefixPattern = $escapedPhrase.'%';
        $containsPattern = '%'.$escapedPhrase.'%';

        $scoreParts = [
            'CASE WHEN LOWER(unaccent(products.name)) = LOWER(unaccent(?)) THEN 100.0 ELSE 0.0 END',
            "CASE WHEN LOWER(unaccent(products.name)) LIKE LOWER(unaccent(?)) ESCAPE '!' THEN 50.0 ELSE 0.0 END",
            "CASE WHEN LOWER(unaccent(products.name)) LIKE LOWER(unaccent(?)) ESCAPE '!' THEN 30.0 ELSE 0.0 END",
            "CASE WHEN LOWER(unaccent(products.summary)) LIKE LOWER(unaccent(?)) ESCAPE '!' THEN 3.0 ELSE 0.0 END",
        ];
        $bindings = [$exactPhrase, $prefixPattern, $containsPattern, $containsPattern];

        if ($terms['fts_words'] !== []) {
            [$tsQuerySql, $tsBindings] = $this->buildPrefixTsQueryExpression($terms['fts_words']);
            $scoreParts[] = 'COALESCE(ts_rank_cd(\''.self::RANK_WEIGHTS."', products.search_vector, {$tsQuerySql}), 0.0) * 25.0";
            array_push($bindings, ...$tsBindings);
        }

        $scoreParts[] = 'CASE WHEN COALESCE(similarity(LOWER(unaccent(products.name)), LOWER(unaccent(?))), 0.0) >= 0.25'
            .' THEN similarity(LOWER(unaccent(products.name)), LOWER(unaccent(?))) * 5.0 ELSE 0.0 END';
        array_push($bindings, $exactPhrase, $exactPhrase);

        foreach ($terms['trigram_words'] as $word) {
            [$tokenScoreSql, $tokenBindings] = $this->buildTrigramTokenScoreExpression($word);
            $scoreParts[] = $tokenScoreSql;
            array_push($bindings, ...$tokenBindings);
        }

        $query->orderByRaw('('.implode(' + ', $scoreParts).') DESC', $bindings);
    }

    /**
     * Score one trigram-eligible token using the highest-ranked matching field above threshold.
     *
     * @return array{0: string, 1: list<string|float>}
     */
    private function buildTrigramTokenScoreExpression(string $word): array
    {
        $threshold = self::TRIGRAM_THRESHOLD;

        $nameScore = $this->thresholdedSimilarityCase('strict_word_similarity(unaccent(?), unaccent(products.name))', 16.0);
        $brandScore = $this->thresholdedSimilarityCase(
            'COALESCE((SELECT strict_word_similarity(unaccent(?), unaccent(brands.name)) FROM brands WHERE brands.id = products.brand_id), 0.0)',
            12.0,
        );
        $categoryScore = $this->thresholdedSimilarityCase(
            'COALESCE((SELECT strict_word_similarity(unaccent(?), unaccent(categories.name)) FROM categories WHERE categories.id = products.category_id), 0.0)',
            10.0,
        );
        $summaryScore = $this->thresholdedSimilarityCase('strict_word_similarity(unaccent(?), unaccent(products.summary))', 4.0);

        return [
            "GREATEST({$nameScore}, {$brandScore}, {$categoryScore}, {$summaryScore})",
            [
                $word, $threshold, $word,
                $word, $threshold, $word,
                $word, $threshold, $word,
                $word, self::TRIGRAM_SUMMARY_THRESHOLD, $word,
            ],
        ];
    }

    private function thresholdedSimilarityCase(string $exprSql, float $weight): string
    {
        $formattedWeight = number_format($weight, 1, '.', '');

        return "CASE WHEN COALESCE({$exprSql}, 0.0) >= ? THEN {$exprSql} * {$formattedWeight} ELSE 0.0 END";
    }

    /**
     * @param  EloquentBuilder<Product>  $query
     */
    private function applyWordFallbackFilter(EloquentBuilder $query, string $word, string $rawToken): void
    {
        [$singleTsQuerySql, $singleTsBindings] = $this->buildPrefixTsQueryExpression([$word]);
        $likePattern = '%'.$this->escapeLike($rawToken).'%';
        $isTrigramEligible = mb_strlen($word) >= self::TRIGRAM_MIN_LENGTH;

        $query->where(function (EloquentBuilder $wordGroup) use (
            $singleTsQuerySql,
            $singleTsBindings,
            $likePattern,
            $word,
            $isTrigramEligible,
        ): void {
            $wordGroup
                ->whereRaw("COALESCE(products.search_vector @@ {$singleTsQuerySql}, FALSE)", $singleTsBindings)
                ->orWhere(function (EloquentBuilder $literalGroup) use ($likePattern): void {
                    $this->applyLiteralMatchBranches($literalGroup, $likePattern);
                });

            if ($isTrigramEligible) {
                $threshold = self::TRIGRAM_THRESHOLD;
                $summaryThreshold = self::TRIGRAM_SUMMARY_THRESHOLD;

                $wordGroup
                    ->orWhereRaw('strict_word_similarity(unaccent(?), unaccent(products.name)) >= ?', [$word, $threshold])
                    ->orWhereRaw('strict_word_similarity(unaccent(?), unaccent(products.summary)) >= ?', [$word, $summaryThreshold])
                    ->orWhereExists(function (QueryBuilder $brandQuery) use ($word, $threshold): void {
                        $brandQuery->selectRaw('1')
                            ->from('brands')
                            ->whereColumn('brands.id', 'products.brand_id')
                            ->whereRaw('strict_word_similarity(unaccent(?), unaccent(brands.name)) >= ?', [$word, $threshold]);
                    })
                    ->orWhereExists(function (QueryBuilder $categoryQuery) use ($word, $threshold): void {
                        $categoryQuery->selectRaw('1')
                            ->from('categories')
                            ->whereColumn('categories.id', 'products.category_id')
                            ->whereRaw('strict_word_similarity(unaccent(?), unaccent(categories.name)) >= ?', [$word, $threshold]);
                    });
            }
        });
    }

    /**
     * @param  EloquentBuilder<Product>  $query
     */
    private function applyLiteralTokenFilter(EloquentBuilder $query, string $token): void
    {
        $pattern = '%'.$this->escapeLike($token).'%';

        $query->where(function (EloquentBuilder $tokenGroup) use ($pattern): void {
            $this->applyLiteralMatchBranches($tokenGroup, $pattern);
        });
    }

    /**
     * @param  EloquentBuilder<Product>  $group
     */
    private function applyLiteralMatchBranches(EloquentBuilder $group, string $pattern): void
    {
        $group
            ->whereRaw("LOWER(unaccent(products.name)) LIKE LOWER(unaccent(?)) ESCAPE '!'", [$pattern])
            ->orWhereRaw("LOWER(unaccent(products.summary)) LIKE LOWER(unaccent(?)) ESCAPE '!'", [$pattern])
            ->orWhereRaw("LOWER(unaccent(products.description)) LIKE LOWER(unaccent(?)) ESCAPE '!'", [$pattern])
            ->orWhereExists(function (QueryBuilder $brandQuery) use ($pattern): void {
                $brandQuery->selectRaw('1')
                    ->from('brands')
                    ->whereColumn('brands.id', 'products.brand_id')
                    ->whereRaw("LOWER(unaccent(brands.name)) LIKE LOWER(unaccent(?)) ESCAPE '!'", [$pattern]);
            })
            ->orWhereExists(function (QueryBuilder $categoryQuery) use ($pattern): void {
                $categoryQuery->selectRaw('1')
                    ->from('categories')
                    ->whereColumn('categories.id', 'products.category_id')
                    ->whereRaw("LOWER(unaccent(categories.name)) LIKE LOWER(unaccent(?)) ESCAPE '!'", [$pattern]);
            });
    }

    /**
     * Build a syntax-error-proof prefix tsquery expression using bound parameters only.
     *
     * @param  non-empty-list<string>  $words
     * @return array{0: string, 1: list<string>}
     */
    private function buildPrefixTsQueryExpression(array $words): array
    {
        $elements = array_fill(
            0,
            count($words),
            "NULLIF(regexp_replace(unaccent(?), '[^[:alnum:]]+', '', 'g'), '') || ':*'",
        );

        $sql = "to_tsquery('english', NULLIF(array_to_string(ARRAY[".implode(', ', $elements)."], ' & '), ''))";

        return [$sql, $words];
    }

    private function containsLikeWildcard(string $token): bool
    {
        return str_contains($token, '%') || str_contains($token, '_');
    }

    /**
     * @return list<string>
     */
    private function extractAlnumWords(string $token): array
    {
        $parts = preg_split('/[^\p{L}\p{N}]+/u', $token, -1, PREG_SPLIT_NO_EMPTY);

        if ($parts === false) {
            return [];
        }

        return $parts;
    }

    private function escapeLike(string $value): string
    {
        return str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $value);
    }
}
