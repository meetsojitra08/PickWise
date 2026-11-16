<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Review;
use Illuminate\Foundation\Http\FormRequest;

class IndexReviewsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', Review::class) ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'status' => ['nullable', 'string', 'in:pending,approved,rejected,all'],
            'search' => ['nullable', 'string', 'max:100'],
            'q' => ['nullable', 'string', 'max:100'],
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
            'sort' => ['nullable', 'string', 'in:created_at,-created_at,rating,-rating,status,-status'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
