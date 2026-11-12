<?php

declare(strict_types=1);

namespace App\Http\Requests\Wishlist;

use App\Models\WishlistItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWishlistItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', WishlistItem::class) ?? false;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'product_id' => [
                'required',
                'integer',
                Rule::exists('products', 'id')
                    ->where('is_published', true)
                    ->whereNull('deleted_at'),
            ],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'product_id.exists' => 'This product is not available to save.',
        ];
    }
}
