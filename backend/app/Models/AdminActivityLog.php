<?php

declare(strict_types=1);

namespace App\Models;

use BadMethodCallException;
use Database\Factories\AdminActivityLogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable([
    'admin_id',
    'action',
    'subject_type',
    'subject_id',
    'changes',
    'ip_address',
    'created_at',
])]
class AdminActivityLog extends Model
{
    /** @use HasFactory<AdminActivityLogFactory> */
    use HasFactory;

    /**
     * Audit logs are append-only records, so there is no updated_at column.
     */
    public $timestamps = false;

    /**
     * Enforce append-only immutability at the Eloquent lifecycle level.
     */
    protected static function booted(): void
    {
        static::updating(function (): never {
            throw new BadMethodCallException('Admin activity logs are append-only and cannot be updated.');
        });

        static::deleting(function (): never {
            throw new BadMethodCallException('Admin activity logs are append-only and cannot be deleted.');
        });
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'admin_id' => 'integer',
            'subject_id' => 'integer',
            'changes' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    /**
     * @return MorphTo<Model, $this>
     */
    public function subject(): MorphTo
    {
        return $this->morphTo('subject');
    }
}
