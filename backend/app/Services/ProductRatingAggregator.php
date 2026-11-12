<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Product;
use App\Models\Review;

/**
 * Keeps denormalized product ratings aligned with approved review records.
 */
final class ProductRatingAggregator
{
    public function recalculate(Product $product): void
    {
        $aggregate = Review::query()
            ->approved()
            ->where('product_id', $product->getKey())
            ->selectRaw('COUNT(*) AS rating_count, COALESCE(AVG(rating), 0) AS rating_avg')
            ->first();

        $product->forceFill([
            'rating_avg' => number_format((float) ($aggregate?->rating_avg ?? 0), 2, '.', ''),
            'rating_count' => (int) ($aggregate?->rating_count ?? 0),
        ])->saveQuietly();
    }
}
