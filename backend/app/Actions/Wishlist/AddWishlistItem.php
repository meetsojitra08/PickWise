<?php

declare(strict_types=1);

namespace App\Actions\Wishlist;

use App\Models\Product;
use App\Models\User;
use App\Models\WishlistItem;

final class AddWishlistItem
{
    /**
     * Add a product to the user's wishlist, returning the existing row when it is already saved.
     *
     * The unique (user_id, product_id) index protects against rapid duplicate requests.
     */
    public function execute(User $user, Product $product): WishlistItem
    {
        return $user->wishlistItems()->createOrFirst([
            'product_id' => $product->id,
        ]);
    }
}
