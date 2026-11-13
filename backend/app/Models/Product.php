<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ProductAvailability;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'category_id',
    'brand_id',
    'name',
    'slug',
    'summary',
    'description',
    'price',
    'currency',
    'availability',
    'store_url',
    'is_published',
])]
#[Hidden(['search_vector'])]
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory, SoftDeletes;

    /**
     * Default attribute values aligned with database column defaults.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'currency' => 'INR',
        'availability' => ProductAvailability::InStock->value,
        'rating_avg' => '0.00',
        'rating_count' => 0,
        'is_published' => true,
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
            'brand_id' => 'integer',
            'price' => 'decimal:2',
            'availability' => ProductAvailability::class,
            'rating_avg' => 'float',
            'rating_count' => 'integer',
            'value_score' => 'integer',
            'is_published' => 'boolean',
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
     * @return BelongsTo<Brand, $this>
     */
    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    /**
     * @return HasMany<ProductImage, $this>
     */
    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)
            ->orderByDesc('is_primary')
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    /**
     * @return HasOne<ProductImage, $this>
     */
    public function primaryImage(): HasOne
    {
        return $this->hasOne(ProductImage::class)
            ->where('is_primary', true)
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    /**
     * @return HasMany<ProductSpec, $this>
     */
    public function specs(): HasMany
    {
        return $this->hasMany(ProductSpec::class);
    }

    /**
     * @return HasMany<PriceHistory, $this>
     */
    public function priceHistory(): HasMany
    {
        return $this->hasMany(PriceHistory::class)
            ->orderBy('recorded_at')
            ->orderBy('id');
    }

    /**
     * @return HasMany<Review, $this>
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /**
     * @return HasMany<WishlistItem, $this>
     */
    public function wishlistItems(): HasMany
    {
        return $this->hasMany(WishlistItem::class);
    }

    /**
     * @return HasMany<ComparisonItem, $this>
     */
    public function comparisonItems(): HasMany
    {
        return $this->hasMany(ComparisonItem::class);
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopePublished(Builder $query): void
    {
        $query->where('is_published', true);
    }
}
