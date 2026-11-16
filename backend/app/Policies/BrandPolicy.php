<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Brand;
use App\Models\User;

class BrandPolicy extends BasePolicy
{
    /**
     * Determine whether the user can view any brands in the admin area.
     */
    public function viewAny(User $user): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can view the brand details.
     */
    public function view(User $user, Brand $brand): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can create brands.
     */
    public function create(User $user): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can update the brand.
     */
    public function update(User $user, Brand $brand): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can delete the brand.
     */
    public function delete(User $user, Brand $brand): bool
    {
        return $this->isActiveAdmin($user);
    }
}
