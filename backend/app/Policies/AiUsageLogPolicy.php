<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

final class AiUsageLogPolicy extends BasePolicy
{
    /**
     * Determine whether the active admin can view AI usage analytics and logs.
     */
    public function viewAny(User $actor): bool
    {
        return $this->isActiveAdmin($actor);
    }
}
