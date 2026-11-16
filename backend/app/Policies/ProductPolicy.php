<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Product;
use App\Models\User;

class ProductPolicy extends BasePolicy
{
    /**
     * Determine whether the user can view any products in the admin area.
     */
    public function viewAny(User $user): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can view the product details.
     */
    public function view(User $user, Product $product): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can create products.
     */
    public function create(User $user): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can update the product.
     */
    public function update(User $user, Product $product): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can delete the product.
     */
    public function delete(User $user, Product $product): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can restore a soft-deleted product.
     */
    public function restore(User $user, Product $product): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can permanently delete the product.
     */
    public function forceDelete(User $user, Product $product): bool
    {
        return $this->isActiveAdmin($user);
    }
}
