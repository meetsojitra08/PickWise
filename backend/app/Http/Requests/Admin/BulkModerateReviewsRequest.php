<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Review;
use Illuminate\Foundation\Http\FormRequest;

class BulkModerateReviewsRequest extends FormRequest
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
            'review_ids' => ['required', 'array', 'min:1'],
            'review_ids.*' => ['integer', 'exists:reviews,id'],
            'status' => ['required', 'string', 'in:approved,rejected'],
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }
}
