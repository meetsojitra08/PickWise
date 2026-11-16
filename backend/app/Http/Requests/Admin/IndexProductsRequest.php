<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\ProductAvailability;
use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexProductsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', Product::class) ?? false;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('is_published')) {
            $val = $this->input('is_published');
            if ($val === 'true') {
                $this->merge(['is_published' => true]);
            } elseif ($val === 'false') {
                $this->merge(['is_published' => false]);
            }
        }
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'brand_id' => ['nullable', 'integer', 'exists:brands,id'],
            'is_published' => ['nullable', 'boolean'],
            'availability' => ['nullable', Rule::enum(ProductAvailability::class)],
            'sort' => ['nullable', 'string', 'in:created_at,-created_at,name,-name,price,-price,value_score,-value_score,rating_avg,-rating_avg'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'trashed' => ['nullable', 'string', 'in:with,only'],
        ];
    }
}
