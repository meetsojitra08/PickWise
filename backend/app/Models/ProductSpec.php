<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SpecDataType;
use Database\Factories\ProductSpecFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['product_id', 'spec_definition_id', 'value_text', 'value_number', 'value_bool'])]
class ProductSpec extends Model
{
    /** @use HasFactory<ProductSpecFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'product_id' => 'integer',
            'spec_definition_id' => 'integer',
            'value_number' => 'float',
            'value_bool' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * @return BelongsTo<SpecDefinition, $this>
     */
    public function specDefinition(): BelongsTo
    {
        return $this->belongsTo(SpecDefinition::class);
    }

    /**
     * Return the typed value matching the given spec data type without triggering lazy loading.
     */
    public function valueFor(SpecDataType $dataType): string|float|bool|null
    {
        return match ($dataType) {
            SpecDataType::Number => $this->value_number,
            SpecDataType::Boolean => $this->value_bool,
            SpecDataType::Text => $this->value_text,
        };
    }
}
