<?php

declare(strict_types=1);

namespace App\Actions\Account;

use App\Models\User;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Str;

final class UpdateProfile
{
    public function __construct(
        private readonly DatabaseManager $database,
    ) {}

    /**
     * Update the authenticated user's display name and normalized email inside a transaction.
     */
    public function execute(User $user, string $name, string $email): User
    {
        return $this->database->transaction(static function () use ($user, $name, $email): User {
            $user->name = trim($name);
            $user->email = Str::lower(trim($email));
            $user->save();

            return $user->refresh();
        });
    }
}
