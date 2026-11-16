<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Review;
use App\Models\User;

class ReviewPolicy extends BasePolicy
{
    public function viewAny(User $actor): bool
    {
        return $this->isActiveAdmin($actor);
    }

    public function view(User $actor, Review $review): bool
    {
        return $this->isActiveAdmin($actor) || ($this->isActive($actor) && $this->owns($actor, $review));
    }

    public function create(User $actor): bool
    {
        return $this->isActive($actor) && $actor->isCustomer();
    }

    public function update(User $actor, Review $review): bool
    {
        return $actor->isCustomer() && $this->owns($actor, $review);
    }

    public function moderate(User $actor, Review $review): bool
    {
        return $this->isActiveAdmin($actor);
    }

    public function delete(User $actor, Review $review): bool
    {
        if ($this->isActiveAdmin($actor)) {
            return true;
        }

        return $actor->isCustomer() && $this->owns($actor, $review);
    }
}
