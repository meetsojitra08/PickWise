<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ProductImage>
 */
class ProductImageFactory extends Factory
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
            'path' => 'products/'.fake()->slug(2).'/'.fake()->unique()->numberBetween(1, 99999).'.webp',
            'alt_text' => Str::limit(fake()->sentence(4), 255, ''),
            'sort_order' => 0,
            'is_primary' => false,
        ];
    }

    /**
     * Mark the image as the product's primary gallery image.
     */
    public function primary(): static
    {
        return $this->state(fn (array $attributes): array => [
            'is_primary' => true,
            'sort_order' => 0,
        ]);
    }
}
