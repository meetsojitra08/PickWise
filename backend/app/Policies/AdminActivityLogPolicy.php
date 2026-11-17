<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

final class AdminActivityLogPolicy extends BasePolicy
{
    /**
     * Determine whether the active admin can view administrative activity logs.
     */
    public function viewAny(User $actor): bool
    {
        return $this->isActiveAdmin($actor);
    }
}
