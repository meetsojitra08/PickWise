<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Brand;
use Illuminate\Foundation\Http\FormRequest;

class IndexBrandsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', Brand::class) ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', 'string', 'in:name,-name,created_at,-created_at'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
