<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Review;
use Illuminate\Foundation\Http\FormRequest;

class ModerateReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Review|null $review */
        $review = $this->route('review');

        return $review !== null && ($this->user()?->can('moderate', $review) ?? false);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', 'string', 'in:pending,approved,rejected'],
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }
}
