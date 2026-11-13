<?php

declare(strict_types=1);

namespace App\Queries\Comparisons;

use App\Models\Comparison;
use App\Models\User;
use App\Queries\Catalog\ActiveCategoryScope;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;

final class UserComparisonsQuery
{
    public function __construct(
        private readonly ActiveCategoryScope $categoryScope,
    ) {}

    /**
     * Paginate the owner's saved comparisons, newest first, with visible products only.
     *
     * @return LengthAwarePaginator<int, Comparison>
     */
    public function forUser(User $user, int $page, int $perPage): LengthAwarePaginator
    {
        $reachableCategoryIds = $this->categoryScope->reachableIds();

        return Comparison::query()
            ->where('user_id', $user->id)
            ->with([
                'items' => function (Relation $relation) use ($reachableCategoryIds): void {
                    $relation->whereHas(
                        'product',
                        static fn (Builder $query): Builder => $query
                            ->published()
                            ->whereIn('category_id', $reachableCategoryIds),
                    )->with([
                        'product.category',
                        'product.brand',
                        'product.primaryImage',
                    ]);
                },
            ])
            ->withCount('items as saved_items_count')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage, ['*'], 'page', $page);
    }
}
