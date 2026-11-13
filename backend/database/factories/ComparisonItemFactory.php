<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Comparison;
use App\Models\ComparisonItem;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ComparisonItem>
 */
class ComparisonItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'comparison_id' => Comparison::factory(),
            'product_id' => Product::factory(),
            'position' => 1,
        ];
    }
}
