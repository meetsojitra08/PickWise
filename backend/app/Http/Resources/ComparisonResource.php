<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Comparison;
use App\Models\ComparisonItem;
use App\Models\Product;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Comparison
 */
class ComparisonResource extends JsonResource
{
    /**
     * Transform a saved comparison into the account list payload.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Collection<int, Product> $products */
        $products = $this->items
            ->map(static fn (ComparisonItem $item): ?Product => $item->product)
            ->filter(static fn (?Product $product): bool => $product instanceof Product)
            ->values();

        $savedItemCount = (int) ($this->getAttribute('saved_items_count') ?? $this->items->count());

        return [
            'id' => $this->id,
            'name' => $this->name,
            'share_token' => $this->share_token,
            'is_shared' => $this->isShared(),
            'item_count' => $products->count(),
            'unavailable_count' => max(0, $savedItemCount - $products->count()),
            'items' => ProductSummaryResource::collection($products),
            'created_at' => $this->created_at?->toIso8601ZuluString(),
            'updated_at' => $this->updated_at?->toIso8601ZuluString(),
        ];
    }
}
