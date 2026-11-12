<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\SpecDataType;
use App\Models\Product;

/**
 * Calculates and stores category-relative Value Scores for published products.
 */
final class ValueScoreCalculator
{
    private const float SPEC_WEIGHT = 0.40;

    private const float RATING_WEIGHT = 0.30;

    private const float PRICE_WEIGHT = 0.30;

    private const float RATING_PRIOR = 4.0;

    private const int RATING_PRIOR_COUNT = 5;

    /**
     * Recalculate every published product in a category and persist the result.
     * Products without a numeric comparable specification remain unscored.
     *
     * @return array<int, int|null> Product id to calculated score.
     */
    public function recalculateCategory(int $categoryId): array
    {
        $products = Product::query()
            ->published()
            ->where('category_id', $categoryId)
            ->with('specs.specDefinition')
            ->get();

        /** @var array<int, array<string, float>> $specValues */
        $specValues = [];
        /** @var array<string, bool> $directionsByKey */
        $directionsByKey = [];

        foreach ($products as $product) {
            foreach ($product->specs as $spec) {
                $definition = $spec->specDefinition;

                if (! $definition->is_comparable
                    || $definition->data_type !== SpecDataType::Number
                    || $definition->higher_is_better === null
                    || $spec->value_number === null) {
                    continue;
                }

                $specValues[$definition->key][$product->id] = (float) $spec->value_number;
                $directionsByKey[$definition->key] = $definition->higher_is_better;
            }
        }

        /** @var array<int, list<float>> $percentilesByProduct */
        $percentilesByProduct = [];

        foreach ($specValues as $definitionKey => $valuesByProduct) {
            foreach ($valuesByProduct as $productId => $value) {
                $percentile = $this->percentile($value, array_values($valuesByProduct));
                $percentilesByProduct[$productId][] = $directionsByKey[$definitionKey]
                    ? $percentile
                    : 1 - $percentile;
            }
        }

        /** @var array<int, float> $strengthByProduct */
        $strengthByProduct = [];

        foreach ($percentilesByProduct as $productId => $percentiles) {
            $strengthByProduct[$productId] = array_sum($percentiles) / count($percentiles);
        }

        $efficiencies = [];

        foreach ($products as $product) {
            $strength = $strengthByProduct[$product->id] ?? null;
            $price = (float) $product->price;

            if ($strength !== null && $price > 0) {
                $efficiencies[$product->id] = $strength / $price;
            }
        }

        $scores = [];

        foreach ($products as $product) {
            $strength = $strengthByProduct[$product->id] ?? null;
            $efficiency = $efficiencies[$product->id] ?? null;

            $score = $strength === null || $efficiency === null
                ? null
                : (int) round(100 * (
                    self::SPEC_WEIGHT * $strength
                    + self::RATING_WEIGHT * $this->ratingConfidence($product)
                    + self::PRICE_WEIGHT * $this->percentile($efficiency, array_values($efficiencies))
                ));

            $product->forceFill(['value_score' => $score])->saveQuietly();
            $scores[$product->id] = $score;
        }

        return $scores;
    }

    private function ratingConfidence(Product $product): float
    {
        $count = $product->rating_count;
        $adjustedRating = (((float) $product->rating_avg * $count)
            + (self::RATING_PRIOR * self::RATING_PRIOR_COUNT))
            / ($count + self::RATING_PRIOR_COUNT);

        return $adjustedRating / 5;
    }

    /**
     * Return a 0–1 midrank percentile. Ties share their rank; a singleton or
     * fully tied group receives the neutral midpoint.
     *
     * @param  list<float>  $values
     */
    private function percentile(float $value, array $values): float
    {
        $count = count($values);

        if ($count <= 1) {
            return 0.5;
        }

        $less = 0;
        $equal = 0;

        foreach ($values as $candidate) {
            if ($candidate < $value) {
                $less++;
            } elseif ($candidate === $value) {
                $equal++;
            }
        }

        return ($less + (($equal - 1) / 2)) / ($count - 1);
    }
}
