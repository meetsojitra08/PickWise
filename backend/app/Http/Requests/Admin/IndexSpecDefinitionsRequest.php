<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\SpecDefinition;
use Illuminate\Foundation\Http\FormRequest;

class IndexSpecDefinitionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', SpecDefinition::class) ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
        ];
    }
}
