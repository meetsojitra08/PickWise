<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\AiConversation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AiConversation
 */
class AiConversationResource extends JsonResource
{
    /**
     * Transform a conversation into a list item summary.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var AiConversation $conversation */
        $conversation = $this->resource;

        return [
            'id' => $conversation->id,
            'title' => $conversation->title,
            'last_message_at' => $conversation->last_message_at?->toIso8601ZuluString(),
            'created_at' => $conversation->created_at?->toIso8601ZuluString(),
            'updated_at' => $conversation->updated_at?->toIso8601ZuluString(),
            'messages_count' => $this->whenCounted('messages'),
        ];
    }
}
