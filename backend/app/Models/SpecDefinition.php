<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SpecDataType;
use Database\Factories\SpecDefinitionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'category_id',
    'key',
    'label',
    'unit',
    'data_type',
    'is_filterable',
    'is_comparable',
    'higher_is_better',
    'sort_order',
])]
class SpecDefinition extends Model
{
    /** @use HasFactory<SpecDefinitionFactory> */
    use HasFactory;

    /**
     * Default attribute values aligned with database column defaults.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'data_type' => SpecDataType::Text->value,
        'is_filterable' => false,
        'is_comparable' => false,
        'sort_order' => 0,
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'category_id' => 'integer',
            'data_type' => SpecDataType::class,
            'is_filterable' => 'boolean',
            'is_comparable' => 'boolean',
            'higher_is_better' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * @return HasMany<ProductSpec, $this>
     */
    public function productSpecs(): HasMany
    {
        return $this->hasMany(ProductSpec::class);
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopeFilterable(Builder $query): void
    {
        $query->where('is_filterable', true);
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopeComparable(Builder $query): void
    {
        $query->where('is_comparable', true);
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }
}
