<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Assistant;

use App\Actions\Assistant\SendAssistantMessage;
use App\Http\Controllers\Controller;
use App\Http\Requests\Assistant\StoreMessageRequest;
use App\Http\Resources\AssistantMessageResource;
use App\Models\AiConversation;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class MessageController extends Controller
{
    public function __construct(
        private readonly SendAssistantMessage $sendMessage,
    ) {}

    public function store(StoreMessageRequest $request, AiConversation $conversation): JsonResponse
    {
        $rawBudget = $request->validated('budget_max');
        $budgetMax = $rawBudget !== null ? (string) $rawBudget : null;

        $result = $this->sendMessage->execute(
            conversation: $conversation,
            messageText: (string) $request->validated('message'),
            categorySlug: $request->validated('category'),
            budgetMax: $budgetMax,
            request: $request,
        );

        return (new AssistantMessageResource($result['message'], $result['products']))
            ->response()
            ->setStatusCode(SymfonyResponse::HTTP_CREATED);
    }
}
