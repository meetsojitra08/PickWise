<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AiFeature;
use App\Enums\AiUsageStatus;
use App\Models\AiUsageLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiUsageLog>
 */
class AiUsageLogFactory extends Factory
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
            'feature' => AiFeature::Assistant,
            'model' => 'test-model',
            'prompt_tokens' => fake()->numberBetween(100, 900),
            'completion_tokens' => fake()->numberBetween(50, 400),
            'latency_ms' => fake()->numberBetween(200, 3000),
            'status' => AiUsageStatus::Ok,
            'error_code' => null,
            'created_at' => now(),
        ];
    }

    /**
     * Indicate that the call was made by a guest with no user account.
     */
    public function guest(): static
    {
        return $this->state(fn (array $attributes): array => [
            'user_id' => null,
        ]);
    }

    /**
     * Indicate that the call failed before returning a usable reply.
     */
    public function failed(string $errorCode = 'connection'): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => AiUsageStatus::Error,
            'error_code' => $errorCode,
        ]);
    }

    /**
     * Indicate that the call was rejected before reaching the AI provider.
     */
    public function rateLimited(): static
    {
        return $this->state(fn (array $attributes): array => [
            'model' => null,
            'prompt_tokens' => null,
            'completion_tokens' => null,
            'latency_ms' => null,
            'status' => AiUsageStatus::RateLimited,
            'error_code' => 'ai_quota_exceeded',
        ]);
    }
}
