<?php

declare(strict_types=1);

namespace App\Data\Compare;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Collection;

/**
 * Typed data transfer object holding a built product comparison matrix.
 *
 * @phpstan-type CompareValue array{product_id: int, value: int|float|bool|string|null}
 * @phpstan-type CompareRow array{
 *     key: string,
 *     label: string,
 *     unit: ?string,
 *     data_type: string,
 *     higher_is_better: ?bool,
 *     winner_product_id: ?int,
 *     values: list<CompareValue>
 * }
 */
final readonly class CompareMatrix
{
    /**
     * @param  Collection<int, Product>  $products  Ordered as requested by the shopper.
     * @param  list<CompareRow>  $rows
     */
    public function __construct(
        public Category $category,
        public Collection $products,
        public array $rows,
    ) {}
}
