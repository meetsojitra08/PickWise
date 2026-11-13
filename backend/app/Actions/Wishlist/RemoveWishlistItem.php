<?php

declare(strict_types=1);

namespace App\Actions\Wishlist;

use App\Models\WishlistItem;

final class RemoveWishlistItem
{
    public function execute(WishlistItem $item): void
    {
        $item->delete();
    }
}
