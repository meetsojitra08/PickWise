<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Models\Brand;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Brand
 */
class AdminBrandResource extends JsonResource
{
    /**
     * Transform the brand resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $rawProductsCount = $this->getAttribute('products_count');

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'logo_path' => $this->logo_path,
            'logo_url' => MediaUrl::fromPublicPath($this->logo_path),
            'products_count' => is_numeric($rawProductsCount)
                ? (int) $rawProductsCount
                : $this->products()->count(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
