<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\Product;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AiConversation
 */
class AiConversationDetailResource extends JsonResource
{
    /**
     * Transform a conversation and its messages with batch-loaded product summaries.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var AiConversation $conversation */
        $conversation = $this->resource;
        $messages = $conversation->messages;

        $products = $this->batchLoadProducts($messages);

        return [
            'id' => $conversation->id,
            'title' => $conversation->title,
            'last_message_at' => $conversation->last_message_at?->toIso8601ZuluString(),
            'created_at' => $conversation->created_at?->toIso8601ZuluString(),
            'updated_at' => $conversation->updated_at?->toIso8601ZuluString(),
            'messages' => $messages->map(
                fn (AiMessage $message): AssistantMessageResource => new AssistantMessageResource($message, $products),
            ),
        ];
    }

    /**
     * @param  Collection<int, AiMessage>  $messages
     * @return Collection<int, Product>
     */
    private function batchLoadProducts(Collection $messages): Collection
    {
        $productIds = [];

        foreach ($messages as $message) {
            $payload = is_array($message->payload) ? $message->payload : [];

            foreach (['recommendations', 'alternatives'] as $section) {
                if (isset($payload[$section]) && is_array($payload[$section])) {
                    foreach ($payload[$section] as $item) {
                        if (is_array($item) && isset($item['product_id']) && is_numeric($item['product_id'])) {
                            $productIds[] = (int) $item['product_id'];
                        }
                    }
                }
            }
        }

        $uniqueIds = array_values(array_unique($productIds));

        if ($uniqueIds === []) {
            return new Collection;
        }

        return Product::query()
            ->with(['category', 'brand', 'primaryImage'])
            ->whereIn('id', $uniqueIds)
            ->get()
            ->keyBy('id');
    }
}
