<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Assistant;

use App\Actions\Assistant\CreateConversation;
use App\Actions\Assistant\DeleteConversation;
use App\Http\Controllers\Controller;
use App\Http\Requests\Assistant\IndexConversationRequest;
use App\Http\Requests\Assistant\StoreConversationRequest;
use App\Http\Resources\AiConversationDetailResource;
use App\Http\Resources\AiConversationResource;
use App\Http\Responses\ApiResponse;
use App\Models\AiConversation;
use App\Queries\Assistant\UserConversationsQuery;
use App\Services\AssistantSessionResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class ConversationController extends Controller
{
    public const int DEFAULT_PER_PAGE = 20;

    public function __construct(
        private readonly UserConversationsQuery $conversations,
        private readonly CreateConversation $createConversation,
        private readonly DeleteConversation $deleteConversation,
        private readonly AssistantSessionResolver $sessionResolver,
    ) {}

    public function index(IndexConversationRequest $request): JsonResponse
    {
        $user = $request->user();
        $sessionKey = $this->sessionResolver->resolve($request);

        $conversations = $this->conversations->paginate(
            $user,
            $sessionKey,
            (int) $request->validated('page', 1),
            (int) $request->validated('per_page', self::DEFAULT_PER_PAGE),
        );

        return AiConversationResource::collection($conversations)
            ->response()
            ->setStatusCode(SymfonyResponse::HTTP_OK);
    }

    public function store(StoreConversationRequest $request): JsonResponse
    {
        $conversation = $this->createConversation->execute(
            $request->user(),
            $this->sessionResolver->resolve($request),
            $request->validated('title'),
        );

        return (new AiConversationDetailResource($conversation))
            ->response()
            ->setStatusCode(SymfonyResponse::HTTP_CREATED);
    }

    public function show(AiConversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        $conversation->load('messages');

        return (new AiConversationDetailResource($conversation))
            ->response()
            ->setStatusCode(SymfonyResponse::HTTP_OK);
    }

    public function destroy(AiConversation $conversation): Response
    {
        $this->authorize('delete', $conversation);

        $this->deleteConversation->execute($conversation);

        return ApiResponse::noContent();
    }
}
