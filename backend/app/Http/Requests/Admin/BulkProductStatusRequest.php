<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;

class BulkProductStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Product::class) ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'product_ids' => ['required', 'array', 'min:1'],
            'product_ids.*' => ['required', 'integer', 'exists:products,id'],
            'is_published' => ['required', 'boolean'],
        ];
    }
}
