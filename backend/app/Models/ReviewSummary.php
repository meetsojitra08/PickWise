<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ReviewSentiment;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'product_id',
    'summary',
    'pros',
    'cons',
    'sentiment',
    'reviews_count',
    'generated_at',
])]
class ReviewSummary extends Model
{
    /**
     * The summary is regenerated in place, so only generated_at is stored.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'product_id' => 'integer',
            'pros' => 'array',
            'cons' => 'array',
            'sentiment' => ReviewSentiment::class,
            'reviews_count' => 'integer',
            'generated_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
