<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ComparisonItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['comparison_id', 'product_id', 'position'])]
class ComparisonItem extends Model
{
    /** @use HasFactory<ComparisonItemFactory> */
    use HasFactory;

    /**
     * Comparison items are ordered rows, not independent records with their own timeline.
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
            'comparison_id' => 'integer',
            'product_id' => 'integer',
            'position' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Comparison, $this>
     */
    public function comparison(): BelongsTo
    {
        return $this->belongsTo(Comparison::class);
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
