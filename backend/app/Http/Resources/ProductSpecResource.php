<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\SpecDataType;
use App\Models\ProductSpec;
use App\Models\SpecDefinition;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use LogicException;

/**
 * @mixin ProductSpec
 */
class ProductSpecResource extends JsonResource
{
    /**
     * Transform a product spec row and its eager-loaded definition into the public API payload.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $definition = $this->relationLoaded('specDefinition') ? $this->specDefinition : null;

        if (! $definition instanceof SpecDefinition) {
            throw new LogicException('ProductSpecResource requires the specDefinition relation to be loaded.');
        }

        return [
            'key' => $definition->key,
            'label' => $definition->label,
            'unit' => $definition->unit,
            'data_type' => $definition->data_type->value,
            'value' => $this->resolveTypedValue($definition->data_type),
            'is_comparable' => $definition->is_comparable,
            'higher_is_better' => $definition->higher_is_better,
        ];
    }

    private function resolveTypedValue(SpecDataType $dataType): string|int|float|bool|null
    {
        $value = $this->valueFor($dataType);

        if ($dataType === SpecDataType::Number && is_float($value)) {
            $rounded = round($value, 4);

            return floor($rounded) === $rounded ? (int) $rounded : $rounded;
        }

        return $value;
    }
}
