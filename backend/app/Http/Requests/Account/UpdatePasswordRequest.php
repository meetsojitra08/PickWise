<?php

declare(strict_types=1);

namespace App\Http\Requests\Account;

use App\Models\User;
use Illuminate\Contracts\Hashing\Hasher;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Validator;

class UpdatePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && $user->can('update', $user);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', Password::min(8), 'max:255', 'confirmed'],
        ];
    }

    /**
     * Verify current password matches and new password differs from the existing hash.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(Hasher $hasher): array
    {
        return [
            function (Validator $validator) use ($hasher): void {
                $user = $this->user();

                if (! $user instanceof User) {
                    return;
                }

                $currentPassword = $this->input('current_password');
                $newPassword = $this->input('password');

                if (
                    is_string($currentPassword)
                    && $currentPassword !== ''
                    && ! $hasher->check($currentPassword, $user->password)
                ) {
                    $validator->errors()->add('current_password', 'The current password is incorrect.');
                }

                if (
                    is_string($newPassword)
                    && $newPassword !== ''
                    && ! $validator->errors()->has('password')
                    && $hasher->check($newPassword, $user->password)
                ) {
                    $validator->errors()->add(
                        'password',
                        'New password must be different from your current password.',
                    );
                }
            },
        ];
    }
}
