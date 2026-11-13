<?php

declare(strict_types=1);

namespace App\Actions\Comparisons;

use App\Models\Comparison;
use Illuminate\Support\Facades\DB;

final class UpdateComparison
{
    /**
     * Rename a comparison and/or replace its ordered products in one transaction.
     *
     * @param  list<int>|null  $productIds  Null keeps the existing products.
     */
    public function execute(Comparison $comparison, ?string $name, ?array $productIds): Comparison
    {
        return DB::transaction(function () use ($comparison, $name, $productIds): Comparison {
            if ($name !== null) {
                $comparison->update(['name' => $name]);
            }

            if ($productIds !== null) {
                $comparison->items()->delete();
                $comparison->items()->createMany(
                    array_map(
                        static fn (int $productId, int $index): array => [
                            'product_id' => $productId,
                            'position' => $index + 1,
                        ],
                        $productIds,
                        array_keys($productIds),
                    ),
                );
            }

            return $comparison->refresh();
        });
    }
}
