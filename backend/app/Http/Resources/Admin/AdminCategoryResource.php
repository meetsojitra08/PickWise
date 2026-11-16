<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Models\Category;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Category
 */
class AdminCategoryResource extends JsonResource
{
    /**
     * Transform the category resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $rawProductsCount = $this->getAttribute('products_count');
        $rawSpecsCount = $this->getAttribute('spec_definitions_count');
        $rawChildrenCount = $this->getAttribute('children_count');

        return [
            'id' => $this->id,
            'parent_id' => $this->parent_id,
            'parent' => $this->parent !== null ? [
                'id' => $this->parent->id,
                'name' => $this->parent->name,
                'slug' => $this->parent->slug,
            ] : null,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'image_path' => $this->image_path,
            'image_url' => MediaUrl::fromPublicPath($this->image_path),
            'sort_order' => $this->sort_order,
            'is_active' => $this->is_active,
            'products_count' => is_numeric($rawProductsCount) ? (int) $rawProductsCount : $this->products()->count(),
            'spec_definitions_count' => is_numeric($rawSpecsCount) ? (int) $rawSpecsCount : $this->specDefinitions()->count(),
            'children_count' => is_numeric($rawChildrenCount) ? (int) $rawChildrenCount : $this->children()->count(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
