<?php

declare(strict_types=1);

namespace App\Queries\Assistant;

use App\Models\AiConversation;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class UserConversationsQuery
{
    /**
     * Paginate conversations for an authenticated user or guest session, newest first.
     *
     * @return LengthAwarePaginator<int, AiConversation>
     */
    public function paginate(?User $user, ?string $sessionKey, int $page, int $perPage): LengthAwarePaginator
    {
        $query = AiConversation::query()->withCount('messages');

        if ($user instanceof User) {
            $query->where('user_id', $user->id);
        } else {
            $query->whereNull('user_id')->where('session_key', $sessionKey);
        }

        return $query
            ->orderByRaw('CASE WHEN last_message_at IS NULL THEN 1 ELSE 0 END, last_message_at DESC')
            ->orderByDesc('id')
            ->paginate($perPage, ['*'], 'page', $page);
    }
}
