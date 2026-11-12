<?php

declare(strict_types=1);

namespace App\Http\Requests\Reviews;

use App\Models\Product;
use App\Models\Review;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Review::class) ?? false;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'rating' => ['required', 'integer', 'between:1,5'],
            'title' => ['required', 'string', 'min:3', 'max:150'],
            'body' => ['required', 'string', 'min:10', 'max:2000'],
            'product_id' => ['prohibited'],
        ];
    }

    /** @return array<int, callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $user = $this->user();
            if ($user === null || $validator->errors()->isNotEmpty()) {
                return;
            }

            $product = Product::query()
                ->published()
                ->where('slug', $this->route('slug'))
                ->first();

            if ($product !== null && $product->reviews()->where('user_id', $user->id)->exists()) {
                $validator->errors()->add('review', 'You have already reviewed this product.');
            }
        }];
    }
}
