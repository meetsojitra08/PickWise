<?php

declare(strict_types=1);

namespace App\Http\Requests\Assistant;

use App\Models\AiConversation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class IndexConversationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::check('viewAny', AiConversation::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:48'],
        ];
    }
}
