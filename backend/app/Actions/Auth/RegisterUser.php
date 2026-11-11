<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Str;

final class RegisterUser
{
    public function __construct(
        private readonly DatabaseManager $database,
    ) {}

    /**
     * Create a new customer account inside a database transaction.
     */
    public function execute(string $name, string $email, string $password): User
    {
        /** @var User $user */
        $user = $this->database->transaction(static function () use ($name, $email, $password): User {
            $user = new User([
                'name' => trim($name),
                'email' => Str::lower(trim($email)),
                'password' => $password,
            ]);

            $user->role = UserRole::Customer;
            $user->is_active = true;
            $user->save();

            return $user;
        });

        return $user;
    }
}
