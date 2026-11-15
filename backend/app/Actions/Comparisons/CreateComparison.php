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
     * @param  array<string, mixed>|null  $aiVerdict
     */
    public function execute(User $user, string $name, array $productIds, ?array $aiVerdict = null): Comparison
    {
        return DB::transaction(function () use ($user, $name, $productIds, $aiVerdict): Comparison {
            $comparison = $user->comparisons()->create([
                'name' => $name,
                'ai_verdict' => $aiVerdict,
            ]);

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
