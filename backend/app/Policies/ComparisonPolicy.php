<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Comparison;
use App\Models\User;

class ComparisonPolicy extends BasePolicy
{
    public function viewAny(User $actor): bool
    {
        return $this->isActive($actor) && $actor->isCustomer();
    }

    public function create(User $actor): bool
    {
        return $this->isActive($actor) && $actor->isCustomer();
    }

    public function view(User $actor, Comparison $comparison): bool
    {
        return $actor->isCustomer() && $this->owns($actor, $comparison);
    }

    public function update(User $actor, Comparison $comparison): bool
    {
        return $actor->isCustomer() && $this->owns($actor, $comparison);
    }

    public function delete(User $actor, Comparison $comparison): bool
    {
        return $actor->isCustomer() && $this->owns($actor, $comparison);
    }

    public function share(User $actor, Comparison $comparison): bool
    {
        return $actor->isCustomer() && $this->owns($actor, $comparison);
    }
}
