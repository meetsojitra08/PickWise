<?php

declare(strict_types=1);

namespace App\Actions\Assistant;

use App\Models\AiConversation;
use App\Models\User;

final class CreateConversation
{
    /**
     * Create a new conversation for a customer or guest session.
     */
    public function execute(?User $user, ?string $sessionKey, ?string $title = null): AiConversation
    {
        return AiConversation::create([
            'user_id' => $user?->id,
            'session_key' => $user === null ? $sessionKey : null,
            'title' => $title !== null && trim($title) !== '' ? trim($title) : null,
            'last_message_at' => null,
        ]);
    }
}
