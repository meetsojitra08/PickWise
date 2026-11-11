<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

abstract class BasePolicy
{
    protected function isActive(User $user): bool
    {
        return $user->isActive();
    }

    protected function isActiveAdmin(User $user): bool
    {
        return $user->isActive() && $user->isAdmin();
    }

    /**
     * Check whether an active user owns the given model via its foreign key attribute.
     */
    protected function owns(User $user, Model $model, string $ownerKey = 'user_id'): bool
    {
        if (! $user->isActive()) {
            return false;
        }

        $ownerId = $model->getAttribute($ownerKey);
        $userId = $user->getKey();

        if (! $this->isPositiveIdentifier($ownerId) || ! $this->isPositiveIdentifier($userId)) {
            return false;
        }

        return (string) $ownerId === (string) $userId;
    }

    private function isPositiveIdentifier(mixed $value): bool
    {
        if (is_int($value)) {
            return $value > 0;
        }

        return is_string($value) && $value !== '' && ctype_digit($value) && (int) $value > 0;
    }
}
