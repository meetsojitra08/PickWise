<?php

declare(strict_types=1);

namespace App\Data\Compare;

use App\Models\Comparison;
use App\Models\Product;
use Illuminate\Database\Eloquent\Collection;

/**
 * A saved comparison resolved for display: only currently visible products are
 * included in the matrix, while unavailable items are counted so the UI can explain them.
 */
final readonly class SavedComparisonView
{
    /**
     * @param  Collection<int, Product>  $products
     */
    public function __construct(
        public Comparison $comparison,
        public Collection $products,
        public ?CompareMatrix $matrix,
        public int $unavailableCount,
    ) {}
}
