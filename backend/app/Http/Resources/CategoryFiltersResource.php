<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Data\Catalog\CategoryFilterFacets;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read CategoryFilterFacets $resource
 */
class CategoryFiltersResource extends JsonResource
{
    /**
     * Transform category filter facets into the public catalog facets payload.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'category' => new CategoryResource($this->resource->category),
            'price_range' => $this->resource->priceRange,
            'brands' => $this->resource->brands,
            'availability' => $this->resource->availability,
            'specs' => $this->resource->specs,
        ];
    }
}
