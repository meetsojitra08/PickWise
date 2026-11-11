<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;

class UserPolicy extends BasePolicy
{
    public function viewAny(User $actor): bool
    {
        return $this->isActiveAdmin($actor);
    }

    public function view(User $actor, User $subject): bool
    {
        return $this->isActive($actor) && ($actor->is($subject) || $actor->isAdmin());
    }

    public function update(User $actor, User $subject): bool
    {
        return $this->isActive($actor) && $actor->is($subject);
    }

    /**
     * Allow active admins to change role or active status on other accounts, never their own.
     */
    public function manage(User $actor, User $subject): Response
    {
        if (! $this->isActiveAdmin($actor)) {
            return Response::deny('Only active administrators can manage user accounts.');
        }

        if ($actor->is($subject)) {
            return Response::deny('You cannot modify your own active status or role.');
        }

        return Response::allow();
    }

    public function delete(User $actor, User $subject): bool
    {
        return false;
    }
}
