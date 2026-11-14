<?php

declare(strict_types=1);

namespace App\Http\Requests\Assistant;

use App\Models\AiConversation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class StoreConversationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::check('create', AiConversation::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['nullable', 'string', 'max:100'],
        ];
    }
}
