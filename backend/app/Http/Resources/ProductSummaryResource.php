<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Product;
use App\Support\MediaUrl;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Product
 */
class ProductSummaryResource extends JsonResource
{
    /**
     * Transform a product into the compact catalog list/card API payload.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'summary' => $this->summary,
            'price' => Money::toArray($this->price, $this->currency),
            'availability' => $this->availability->value,
            'availability_label' => $this->availability->label(),
            'rating_avg' => round((float) $this->rating_avg, 2),
            'rating_count' => $this->rating_count,
            'value_score' => $this->value_score,
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
            'brand' => $this->whenLoaded(
                'brand',
                fn (): ?BrandResource => $this->brand !== null ? new BrandResource($this->brand) : null,
            ),
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
            'created_at' => $this->created_at?->toIso8601ZuluString(),
        ];
    }
}
