<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Comparison;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Comparison>
 */
class ComparisonFactory extends Factory
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
            'name' => fake()->words(3, true),
            'ai_verdict' => null,
            'share_token' => null,
        ];
    }

    /**
     * Indicate that the comparison is publicly shareable.
     */
    public function shared(?string $token = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'share_token' => $token ?? fake()->regexify('[A-Za-z0-9]{32}'),
        ]);
    }
}
