<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Product;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Product
 */
class ProductDetailResource extends JsonResource
{
    /**
     * Transform a published product into the full product detail API payload.
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
            'description' => $this->description,
            'price' => Money::toArray($this->price, $this->currency),
            'availability' => $this->availability->value,
            'availability_label' => $this->availability->label(),
            'store_url' => $this->store_url,
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
            'primary_image' => $this->whenLoaded(
                'primaryImage',
                fn (): ?ProductImageResource => $this->primaryImage !== null ? new ProductImageResource($this->primaryImage) : null,
            ),
            'images' => $this->whenLoaded(
                'images',
                fn (): AnonymousResourceCollection => ProductImageResource::collection($this->images),
            ),
            'specs' => $this->whenLoaded(
                'specs',
                fn (): AnonymousResourceCollection => ProductSpecResource::collection($this->specs),
            ),
            'created_at' => $this->created_at?->toIso8601ZuluString(),
            'updated_at' => $this->updated_at?->toIso8601ZuluString(),
        ];
    }
}
