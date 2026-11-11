<?php

declare(strict_types=1);

namespace App\Http\Requests\Account;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UpdatePreferencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && $user->can('update', $user);
    }

    protected function prepareForValidation(): void
    {
        $updates = [];

        if ($this->input('budget_default') === '') {
            $updates['budget_default'] = null;
        }

        $categories = $this->input('favourite_categories');
        if (is_array($categories)) {
            $updates['favourite_categories'] = array_map(
                static fn (mixed $item): mixed => is_string($item) ? Str::lower(trim($item)) : $item,
                $categories,
            );
        }

        $priorities = $this->input('priorities');
        if (is_array($priorities)) {
            $updates['priorities'] = array_map(
                static fn (mixed $item): mixed => is_string($item) ? trim($item) : $item,
                $priorities,
            );
        }

        if ($updates !== []) {
            $this->merge($updates);
        }
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'budget_default' => ['nullable', 'numeric', 'min:0', 'max:100000000'],
            'favourite_categories' => ['nullable', 'array', 'max:20'],
            'favourite_categories.*' => $this->categoryItemRules(),
            'priorities' => ['nullable', 'array', 'max:5'],
            'priorities.*' => ['required', 'string', 'min:2', 'max:50', 'distinct:ignore_case'],
        ];
    }

    /**
     * Enforce database category slugs once seeded (P2+); fall back to slug format during P1 or unseeded tests.
     *
     * @return array<int, mixed>
     */
    private function categoryItemRules(): array
    {
        $rules = ['required', 'string', 'min:2', 'max:100', 'distinct'];

        if (Schema::hasTable('categories') && DB::table('categories')->where('is_active', true)->exists()) {
            $rules[] = Rule::exists('categories', 'slug')->where('is_active', true);
        } else {
            $rules[] = 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/';
        }

        return $rules;
    }
}
