<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use App\Models\WishlistItem;

class WishlistItemPolicy extends BasePolicy
{
    public function viewAny(User $actor): bool
    {
        return $this->isActive($actor) && $actor->isCustomer();
    }

    public function create(User $actor): bool
    {
        return $this->isActive($actor) && $actor->isCustomer();
    }

    public function delete(User $actor, WishlistItem $item): bool
    {
        return $actor->isCustomer() && $this->owns($actor, $item);
    }
}
