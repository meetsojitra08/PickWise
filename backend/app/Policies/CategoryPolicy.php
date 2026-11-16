<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Category;
use App\Models\User;

class CategoryPolicy extends BasePolicy
{
    /**
     * Determine whether the user can view any categories in the admin area.
     */
    public function viewAny(User $user): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can view the category details.
     */
    public function view(User $user, Category $category): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can create categories.
     */
    public function create(User $user): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can update the category.
     */
    public function update(User $user, Category $category): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can delete the category.
     */
    public function delete(User $user, Category $category): bool
    {
        return $this->isActiveAdmin($user);
    }
}
