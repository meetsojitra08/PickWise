<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Models\SpecDefinition;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin SpecDefinition
 */
class AdminSpecDefinitionResource extends JsonResource
{
    /**
     * Transform the spec definition resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $rawProductSpecsCount = $this->getAttribute('product_specs_count');

        return [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'key' => $this->key,
            'label' => $this->label,
            'unit' => $this->unit,
            'data_type' => $this->data_type->value,
            'is_filterable' => $this->is_filterable,
            'is_comparable' => $this->is_comparable,
            'higher_is_better' => $this->higher_is_better,
            'sort_order' => $this->sort_order,
            'product_specs_count' => is_numeric($rawProductSpecsCount)
                ? (int) $rawProductSpecsCount
                : $this->productSpecs()->count(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
