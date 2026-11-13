<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ComparisonFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['user_id', 'name', 'ai_verdict', 'share_token'])]
#[Hidden(['share_token'])]
class Comparison extends Model
{
    /** @use HasFactory<ComparisonFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'ai_verdict' => 'array',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<ComparisonItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(ComparisonItem::class)
            ->orderBy('position')
            ->orderBy('id');
    }

    public function isShared(): bool
    {
        return $this->share_token !== null;
    }
}
