<?php

declare(strict_types=1);

namespace App\Http\Requests\Wishlist;

use App\Models\WishlistItem;
use Illuminate\Foundation\Http\FormRequest;

class IndexWishlistRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', WishlistItem::class) ?? false;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:48'],
        ];
    }
}
