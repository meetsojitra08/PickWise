<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Contracts\Hashing\Hasher;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class AuthenticateUser
{
    /**
     * Pre-computed bcrypt hash used when no user record exists to keep check timing uniform.
     */
    private const string DUMMY_BCRYPT_HASH = '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

    public function __construct(
        private readonly Hasher $hasher,
    ) {}

    /**
     * Verify credentials and account status before starting a session.
     *
     * @throws ValidationException
     */
    public function execute(string $email, string $password): User
    {
        $normalizedEmail = Str::lower(trim($email));
        $user = User::query()->where('email', $normalizedEmail)->first();

        $hashedPassword = $user instanceof User ? $user->password : self::DUMMY_BCRYPT_HASH;

        if (! $this->hasher->check($password, $hashedPassword) || ! $user instanceof User) {
            throw ValidationException::withMessages([
                'email' => ['Email or password is incorrect.'],
            ]);
        }

        if (! $user->isActive()) {
            throw ValidationException::withMessages([
                'email' => ['Your account has been deactivated.'],
            ]);
        }

        return $user;
    }
}
