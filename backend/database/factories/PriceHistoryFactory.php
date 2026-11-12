<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\PriceHistory;
use App\Models\Product;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PriceHistory>
 */
class PriceHistoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'price' => number_format(fake()->numberBetween(999, 199999), 2, '.', ''),
            'recorded_at' => fake()->dateTimeBetween('-6 months', 'now')->format('Y-m-d'),
        ];
    }

    /**
     * Set the date on which the price point was recorded.
     */
    public function recordedOn(CarbonInterface|string $date): static
    {
        $formatted = $date instanceof CarbonInterface ? $date->toDateString() : $date;

        return $this->state(fn (array $attributes): array => [
            'recorded_at' => $formatted,
        ]);
    }
}
