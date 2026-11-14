<?php

declare(strict_types=1);

namespace App\Actions\Assistant;

use App\Data\Assistant\AssistantQuery;
use App\Data\Assistant\AssistantRecommendation;
use App\Enums\AssistantReplyStatus;
use App\Enums\MessageRole;
use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\Product;
use App\Services\AiQuotaService;
use App\Services\AssistantService;
use Illuminate\Database\DatabaseManager;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class SendAssistantMessage
{
    public function __construct(
        private readonly AssistantService $assistantService,
        private readonly AiQuotaService $quotaService,
        private readonly DatabaseManager $db,
    ) {}

    /**
     * Store the shopper message, query the assistant, consume quota on success,
     * persist the model reply, and update the conversation timestamp and title.
     *
     * @return array{message: AiMessage, products: array<int, Product>}
     */
    public function execute(
        AiConversation $conversation,
        string $messageText,
        ?string $categorySlug,
        ?string $budgetMax,
        Request $request,
    ): array {
        $user = $request->user();

        // 1. Store the user's message
        AiMessage::create([
            'conversation_id' => $conversation->id,
            'role' => MessageRole::User,
            'content' => $messageText,
            'payload' => array_filter([
                'constraints' => array_filter([
                    'category' => $categorySlug,
                    'budget_max' => $budgetMax,
                ], static fn (mixed $value): bool => $value !== null),
            ]),
            'status' => AssistantReplyStatus::Ok,
        ]);

        // 2. Query the assistant service
        $query = new AssistantQuery(
            message: $messageText,
            categorySlug: $categorySlug,
            budgetMax: $budgetMax,
        );
        $answer = $this->assistantService->answer($query, $user);

        // 3. Consume quota only on successful grounded answers
        if ($answer->status === AssistantReplyStatus::Ok) {
            $this->quotaService->consume($request);
        }

        // 4. Save the assistant response and update conversation
        $payload = [
            'recommendations' => array_map(
                static fn (AssistantRecommendation $rec): array => [
                    'product_id' => $rec->product->id,
                    'reason' => $rec->reason,
                    'tradeoffs' => $rec->tradeoffs,
                ],
                $answer->recommendations,
            ),
            'alternatives' => array_map(
                static fn (AssistantRecommendation $alt): array => [
                    'product_id' => $alt->product->id,
                    'reason' => $alt->reason,
                    'tradeoffs' => $alt->tradeoffs,
                ],
                $answer->alternatives,
            ),
        ];

        return $this->db->transaction(function () use ($conversation, $messageText, $answer, $payload): array {
            $assistantMessage = AiMessage::create([
                'conversation_id' => $conversation->id,
                'role' => MessageRole::Assistant,
                'content' => $answer->content,
                'payload' => $payload,
                'status' => $answer->status,
            ]);

            $conversation->last_message_at = now();

            if ($conversation->title === null || trim($conversation->title) === '') {
                $conversation->title = Str::limit($messageText, 60);
            }

            $conversation->save();

            $products = [];
            foreach (array_merge($answer->recommendations, $answer->alternatives) as $item) {
                $products[$item->product->id] = $item->product;
            }

            return [
                'message' => $assistantMessage,
                'products' => $products,
            ];
        });
    }
}
