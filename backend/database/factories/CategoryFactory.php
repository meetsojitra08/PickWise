<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'parent_id' => null,
            'name' => Str::limit(Str::title(fake()->unique()->words(2, true)), 120, ''),
            'slug' => function (array $attributes): string {
                $base = Str::slug((string) $attributes['name']);

                return ($base !== '' ? $base : 'category').'-'.fake()->unique()->numberBetween(100, 99999);
            },
            'description' => fake()->sentence(),
            'image_path' => null,
            'sort_order' => 0,
            'is_active' => true,
        ];
    }

    /**
     * Indicate that the category is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes): array => [
            'is_active' => false,
        ]);
    }

    /**
     * Attach the category under a parent category.
     */
    public function childOf(?Category $parent = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'parent_id' => $parent instanceof Category ? $parent->id : Category::factory(),
        ]);
    }
}
