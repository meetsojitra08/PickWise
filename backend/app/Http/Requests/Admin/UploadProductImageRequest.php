<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;

class UploadProductImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        $product = $this->route('product');

        if (! $product instanceof Product) {
            return false;
        }

        return $this->user()?->can('update', $product) ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'image' => [
                'required',
                'file',
                'image',
                'mimes:jpeg,jpg,png,webp',
                'extensions:jpeg,jpg,png,webp',
                'max:5120',
            ],
            'alt_text' => ['required', 'string', 'min:2', 'max:255'],
            'is_primary' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'image.required' => 'An image file is required.',
            'image.image' => 'The uploaded file must be a valid image.',
            'image.mimes' => 'The image must be a file of type: jpeg, jpg, png, webp.',
            'image.max' => 'The image may not be greater than 5 MB in size.',
            'alt_text.required' => 'Alternative text is required for accessibility.',
        ];
    }
}
