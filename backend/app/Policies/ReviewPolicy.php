<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Review;
use App\Models\User;

class ReviewPolicy extends BasePolicy
{
    public function create(User $actor): bool
    {
        return $this->isActive($actor) && $actor->isCustomer();
    }

    public function update(User $actor, Review $review): bool
    {
        return $actor->isCustomer() && $this->owns($actor, $review);
    }

    public function delete(User $actor, Review $review): bool
    {
        return $actor->isCustomer() && $this->owns($actor, $review);
    }
}
