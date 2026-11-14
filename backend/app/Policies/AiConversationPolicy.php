<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\AiConversation;
use App\Models\User;
use App\Services\AssistantSessionResolver;
use Illuminate\Http\Request;

class AiConversationPolicy extends BasePolicy
{
    public function __construct(
        private readonly AssistantSessionResolver $sessionResolver,
    ) {}

    public function viewAny(?User $user): bool
    {
        return $user === null || $this->isActive($user);
    }

    public function create(?User $user): bool
    {
        return $user === null || $this->isActive($user);
    }

    public function view(?User $user, AiConversation $conversation): bool
    {
        return $this->ownsConversation($user, $conversation);
    }

    public function sendMessage(?User $user, AiConversation $conversation): bool
    {
        return $this->ownsConversation($user, $conversation);
    }

    public function delete(?User $user, AiConversation $conversation): bool
    {
        return $this->ownsConversation($user, $conversation);
    }

    private function ownsConversation(?User $user, AiConversation $conversation): bool
    {
        if ($conversation->user_id !== null) {
            return $user !== null && $this->owns($user, $conversation);
        }

        /** @var Request $request */
        $request = request();
        $sessionKey = $this->sessionResolver->resolve($request);

        return $conversation->session_key !== null && $conversation->session_key === $sessionKey;
    }
}
