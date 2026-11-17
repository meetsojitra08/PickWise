<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\ProductImage;
use App\Models\User;

class ProductImagePolicy extends BasePolicy
{
    /**
     * Determine whether the user can view any product images in the admin area.
     */
    public function viewAny(User $user): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can view a specific product image.
     */
    public function view(User $user, ProductImage $image): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can upload/create product images.
     */
    public function create(User $user): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can update a product image.
     */
    public function update(User $user, ProductImage $image): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can delete a product image.
     */
    public function delete(User $user, ProductImage $image): bool
    {
        return $this->isActiveAdmin($user);
    }
}
