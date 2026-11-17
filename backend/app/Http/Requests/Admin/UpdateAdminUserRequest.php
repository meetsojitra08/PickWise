<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateAdminUserRequest extends FormRequest
{
    /**
     * @throws AuthorizationException
     */
    public function authorize(): bool
    {
        $targetUser = $this->route('user');

        if (! $targetUser instanceof User) {
            return false;
        }

        $response = Gate::inspect('manage', $targetUser);

        if ($response->denied()) {
            throw new AuthorizationException($response->message());
        }

        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'is_active' => ['sometimes', 'boolean'],
            'role' => ['sometimes', Rule::enum(UserRole::class)],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            if (! $this->has('is_active') && ! $this->has('role')) {
                $v->errors()->add('is_active', 'At least one of is_active or role must be provided.');
            }
        });
    }
}
