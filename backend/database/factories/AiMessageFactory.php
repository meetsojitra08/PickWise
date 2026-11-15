<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AssistantReplyStatus;
use App\Enums\MessageRole;
use App\Models\AiConversation;
use App\Models\AiMessage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiMessage>
 */
class AiMessageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'conversation_id' => AiConversation::factory(),
            'role' => MessageRole::User,
            'content' => fake()->paragraph(),
            'payload' => null,
            'status' => AssistantReplyStatus::Ok,
        ];
    }

    /**
     * Indicate that the message was sent by the assistant.
     *
     * @param  array<string, mixed>|null  $payload
     */
    public function assistant(?array $payload = null, AssistantReplyStatus $status = AssistantReplyStatus::Ok): static
    {
        return $this->state(fn (array $attributes): array => [
            'role' => MessageRole::Assistant,
            'payload' => $payload,
            'status' => $status,
        ]);
    }
}
