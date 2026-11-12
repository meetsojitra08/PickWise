<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\WishlistItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin WishlistItem
 */
class WishlistItemResource extends JsonResource
{
    /**
     * Transform a saved product into the wishlist API payload.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product' => $this->whenLoaded(
                'product',
                fn (): ?ProductSummaryResource => $this->product !== null
                    ? new ProductSummaryResource($this->product)
                    : null,
            ),
            'created_at' => $this->created_at?->toIso8601ZuluString(),
        ];
    }
}
