<?php

declare(strict_types=1);

namespace App\Actions\Comparisons;

use App\Models\Comparison;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class CreateComparison
{
    /**
     * Save a named comparison with its products in the shopper's chosen order.
     *
     * @param  list<int>  $productIds
     */
    public function execute(User $user, string $name, array $productIds): Comparison
    {
        return DB::transaction(function () use ($user, $name, $productIds): Comparison {
            $comparison = $user->comparisons()->create(['name' => $name]);

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

            return $comparison;
        });
    }
}
