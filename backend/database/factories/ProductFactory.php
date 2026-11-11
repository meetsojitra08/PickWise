<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ProductAvailability;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category_id' => Category::factory(),
            'brand_id' => Brand::factory(),
            'name' => Str::limit(Str::title(fake()->unique()->words(3, true)), 200, ''),
            'slug' => function (array $attributes): string {
                $base = Str::slug((string) $attributes['name']);

                return ($base !== '' ? $base : 'product').'-'.fake()->unique()->numberBetween(100, 99999);
            },
            'summary' => Str::limit(fake()->sentence(8), 300, ''),
            'description' => fake()->paragraphs(2, true),
            'price' => number_format(fake()->numberBetween(999, 199999), 2, '.', ''),
            'currency' => 'INR',
            'availability' => ProductAvailability::InStock->value,
            'store_url' => function (array $attributes): string {
                $slug = Str::slug((string) $attributes['name']);

                return Str::limit('https://store.example.com/products/'.($slug !== '' ? $slug : 'item'), 2048, '');
            },
            'rating_avg' => '0.00',
            'rating_count' => 0,
            'value_score' => null,
            'is_published' => true,
            'search_vector' => null,
        ];
    }

    /**
     * Indicate that the product is unpublished.
     */
    public function unpublished(): static
    {
        return $this->state(fn (array $attributes): array => [
            'is_published' => false,
        ]);
    }

    /**
     * Indicate that the product is low in stock.
     */
    public function lowStock(): static
    {
        return $this->state(fn (array $attributes): array => [
            'availability' => ProductAvailability::LowStock->value,
        ]);
    }

    /**
     * Indicate that the product is out of stock.
     */
    public function outOfStock(): static
    {
        return $this->state(fn (array $attributes): array => [
            'availability' => ProductAvailability::OutOfStock->value,
        ]);
    }

    /**
     * Set denormalized review rating aggregates on the product.
     */
    public function withRating(float $average, int $count = 1): static
    {
        return $this->state(fn (array $attributes): array => [
            'rating_avg' => number_format($average, 2, '.', ''),
            'rating_count' => $count,
        ]);
    }

    /**
     * Set a computed value score on the product.
     */
    public function withValueScore(int $score): static
    {
        return $this->state(fn (array $attributes): array => [
            'value_score' => $score,
        ]);
    }
}
