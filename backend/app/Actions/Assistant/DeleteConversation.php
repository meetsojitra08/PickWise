<?php

declare(strict_types=1);

namespace App\Actions\Assistant;

use App\Models\AiConversation;

final class DeleteConversation
{
    /**
     * Delete a conversation and cascade all its messages.
     */
    public function execute(AiConversation $conversation): void
    {
        $conversation->delete();
    }
}
