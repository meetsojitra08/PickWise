<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\AiConversation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiConversation>
 */
class AiConversationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'session_key' => null,
            'title' => fake()->sentence(3),
            'last_message_at' => now(),
        ];
    }

    /**
     * Indicate that the conversation belongs to a guest session.
     */
    public function guest(?string $sessionKey = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'user_id' => null,
            'session_key' => $sessionKey ?? fake()->uuid(),
        ]);
    }
}
