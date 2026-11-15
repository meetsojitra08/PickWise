<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AssistantReplyStatus;
use App\Enums\MessageRole;
use Database\Factories\AiMessageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $conversation_id
 * @property MessageRole $role
 * @property string $content
 * @property array<string, mixed>|null $payload
 * @property AssistantReplyStatus $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read AiConversation $conversation
 */
#[Fillable(['conversation_id', 'role', 'content', 'payload', 'status'])]
class AiMessage extends Model
{
    /** @use HasFactory<AiMessageFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'conversation_id' => 'integer',
            'role' => MessageRole::class,
            'payload' => 'array',
            'status' => AssistantReplyStatus::class,
        ];
    }

    /**
     * @return BelongsTo<AiConversation, $this>
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(AiConversation::class, 'conversation_id');
    }

    /**
     * Alias matching the model class name for Eloquent factory and relationship conventions.
     *
     * @return BelongsTo<AiConversation, $this>
     */
    public function aiConversation(): BelongsTo
    {
        return $this->conversation();
    }
}
