<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\AiMessage;
use App\Models\Product;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AiMessage
 */
class AssistantMessageResource extends JsonResource
{
    /**
     * @param  array<int, Product>|Collection<int, Product>  $products
     */
    public function __construct(
        mixed $resource,
        private readonly array|Collection $products = [],
    ) {
        parent::__construct($resource);
    }

    /**
     * Transform the message into the assistant reply or thread message API payload.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var AiMessage $message */
        $message = $this->resource;
        $payload = is_array($message->payload) ? $message->payload : [];

        return [
            'id' => $message->id,
            'role' => $message->role->value,
            'content' => $message->content,
            'recommendations' => $this->transformRecommendations($payload['recommendations'] ?? []),
            'alternatives' => $this->transformRecommendations($payload['alternatives'] ?? []),
            'status' => $message->status->value,
            'created_at' => $message->created_at?->toIso8601ZuluString(),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function transformRecommendations(mixed $items): array
    {
        if (! is_array($items)) {
            return [];
        }

        $result = [];

        foreach ($items as $item) {
            if (! is_array($item) || ! isset($item['product_id']) || ! is_numeric($item['product_id'])) {
                continue;
            }

            $productId = (int) $item['product_id'];
            $product = $this->resolveProduct($productId);

            $result[] = [
                'product_id' => $productId,
                'product' => $product !== null ? new ProductSummaryResource($product) : null,
                'reason' => isset($item['reason']) && is_string($item['reason']) ? $item['reason'] : null,
                'tradeoffs' => isset($item['tradeoffs']) && is_array($item['tradeoffs'])
                    ? array_values(array_filter($item['tradeoffs'], is_string(...)))
                    : [],
            ];
        }

        return $result;
    }

    private function resolveProduct(int $productId): ?Product
    {
        if ($this->products instanceof Collection) {
            /** @var Product|null $found */
            $found = $this->products->get($productId);

            return $found;
        }

        return $this->products[$productId] ?? null;
    }
}
