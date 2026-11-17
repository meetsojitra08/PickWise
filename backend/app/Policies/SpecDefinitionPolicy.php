<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\SpecDefinition;
use App\Models\User;

class SpecDefinitionPolicy extends BasePolicy
{
    /**
     * Determine whether the user can view any spec definitions.
     */
    public function viewAny(User $user): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can view the spec definition.
     */
    public function view(User $user, SpecDefinition $specDefinition): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can create spec definitions.
     */
    public function create(User $user): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can update the spec definition.
     */
    public function update(User $user, SpecDefinition $specDefinition): bool
    {
        return $this->isActiveAdmin($user);
    }

    /**
     * Determine whether the user can delete the spec definition.
     */
    public function delete(User $user, SpecDefinition $specDefinition): bool
    {
        return $this->isActiveAdmin($user);
    }
}
