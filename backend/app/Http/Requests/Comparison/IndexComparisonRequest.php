<?php

declare(strict_types=1);

namespace App\Http\Requests\Comparison;

use App\Models\Comparison;
use Illuminate\Foundation\Http\FormRequest;

class IndexComparisonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', Comparison::class) ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:48'],
        ];
    }
}
