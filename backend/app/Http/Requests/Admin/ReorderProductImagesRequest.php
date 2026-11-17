<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ReorderProductImagesRequest extends FormRequest
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
            'image_ids' => ['required', 'array', 'min:1'],
            'image_ids.*' => ['required', 'integer', 'distinct'],
            'primary_id' => ['nullable', 'integer'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $product = $this->route('product');

                if (! $product instanceof Product) {
                    return;
                }

                $ids = $this->input('image_ids');
                if (! is_array($ids) || $ids === []) {
                    return;
                }

                $validCount = $product->images()->whereIn('id', $ids)->count();

                if ($validCount !== count($ids)) {
                    $validator->errors()->add(
                        'image_ids',
                        'One or more image IDs do not belong to this product.',
                    );
                }

                if ($this->filled('primary_id')) {
                    $primaryId = (int) $this->input('primary_id');
                    $exists = $product->images()->where('id', $primaryId)->exists();

                    if (! $exists) {
                        $validator->errors()->add(
                            'primary_id',
                            'The selected primary image does not belong to this product.',
                        );
                    }
                }
            },
        ];
    }
}
