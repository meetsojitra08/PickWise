<?php

declare(strict_types=1);

namespace App\Queries\Wishlist;

use App\Models\User;
use App\Models\WishlistItem;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

final class WishlistItemsQuery
{
    /**
     * Paginate the user's saved products, newest first, hiding unpublished and removed products.
     *
     * @return LengthAwarePaginator<int, WishlistItem>
     */
    public function forUser(User $user, int $page, int $perPage): LengthAwarePaginator
    {
        return WishlistItem::query()
            ->where('user_id', $user->id)
            ->whereHas('product', static fn (Builder $query): Builder => $query->published())
            ->with(['product.category', 'product.brand', 'product.primaryImage'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Find the user's saved row for a product without exposing rows owned by other users.
     */
    public function findForUser(User $user, int $productId): ?WishlistItem
    {
        return WishlistItem::query()
            ->where('user_id', $user->id)
            ->where('product_id', $productId)
            ->first();
    }
}
