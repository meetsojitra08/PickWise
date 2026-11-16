<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Http\Resources\ProductImageResource;
use App\Models\PriceHistory;
use App\Models\Product;
use App\Support\MediaUrl;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Product
 */
class AdminProductResource extends JsonResource
{
    /**
     * Transform the product resource into an administrative API payload.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'brand_id' => $this->brand_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'summary' => $this->summary,
            'description' => $this->description,
            'price' => Money::toArray($this->price, $this->currency),
            'currency' => $this->currency,
            'availability' => $this->availability->value,
            'availability_label' => $this->availability->label(),
            'store_url' => $this->store_url,
            'rating_avg' => round((float) $this->rating_avg, 2),
            'rating_count' => (int) $this->rating_count,
            'value_score' => $this->value_score,
            'is_published' => (bool) $this->is_published,
            'is_deleted' => $this->trashed(),
            'category' => $this->whenLoaded('category', function (): ?array {
                if ($this->category === null) {
                    return null;
                }

                return [
                    'id' => $this->category->id,
                    'name' => $this->category->name,
                    'slug' => $this->category->slug,
                ];
            }),
            'brand' => $this->whenLoaded('brand', function (): ?array {
                if ($this->brand === null) {
                    return null;
                }

                return [
                    'id' => $this->brand->id,
                    'name' => $this->brand->name,
                    'slug' => $this->brand->slug,
                ];
            }),
            'primary_image' => $this->whenLoaded('primaryImage', function (): ?array {
                if ($this->primaryImage === null) {
                    return null;
                }

                return [
                    'id' => $this->primaryImage->id,
                    'url' => MediaUrl::fromPublicPath($this->primaryImage->path),
                    'alt_text' => $this->primaryImage->alt_text,
                ];
            }),
            'images' => $this->whenLoaded(
                'images',
                fn (): AnonymousResourceCollection => ProductImageResource::collection($this->images),
            ),
            'specs' => $this->whenLoaded(
                'specs',
                fn (): AnonymousResourceCollection => AdminProductSpecResource::collection($this->specs),
            ),
            'price_history' => $this->whenLoaded('priceHistory', function (): array {
                return $this->priceHistory->map(fn (PriceHistory $point): array => [
                    'id' => $point->id,
                    'recorded_at' => $point->recorded_at->toDateString(),
                    'price' => Money::toArray($point->price, $this->currency),
                ])->values()->all();
            }),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
        ];
    }
}
