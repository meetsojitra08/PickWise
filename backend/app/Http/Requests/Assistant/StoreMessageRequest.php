<?php

declare(strict_types=1);

namespace App\Http\Requests\Assistant;

use App\Models\AiConversation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class StoreMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        $conversation = $this->route('conversation');

        if (! $conversation instanceof AiConversation) {
            return false;
        }

        return Gate::check('sendMessage', $conversation);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'message' => ['required', 'string', 'min:2', 'max:500'],
            'category' => ['nullable', 'string', 'exists:categories,slug'],
            'budget_max' => ['nullable', 'numeric', 'gt:0', 'max:999999999'],
        ];
    }
}
