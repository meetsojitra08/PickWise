<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Category;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Category
 */
class CategoryResource extends JsonResource
{
    /**
     * Transform a category node into the public API payload.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $rawProductsCount = $this->getAttribute('products_count');

        return [
            'id' => $this->id,
            'parent_id' => $this->parent_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'image_url' => MediaUrl::fromPublicPath($this->image_path),
            'sort_order' => $this->sort_order,
            'products_count' => $this->when(
                array_key_exists('products_count', $this->getAttributes()),
                static fn (): int => is_numeric($rawProductsCount) ? (int) $rawProductsCount : 0,
            ),
            'children' => $this->whenLoaded(
                'children',
                fn (): AnonymousResourceCollection => self::collection($this->children),
            ),
        ];
    }
}
