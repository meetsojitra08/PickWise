<?php

declare(strict_types=1);

namespace App\Actions\Account;

use App\Models\User;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Str;

final class UpdatePassword
{
    public function __construct(
        private readonly DatabaseManager $database,
    ) {}

    /**
     * Persist a new hashed password and rotate the remember token to invalidate old recaller cookies.
     */
    public function execute(User $user, string $newPassword): User
    {
        return $this->database->transaction(static function () use ($user, $newPassword): User {
            $user->password = $newPassword;
            $user->setRememberToken(Str::random(60));
            $user->save();

            return $user->refresh();
        });
    }
}
