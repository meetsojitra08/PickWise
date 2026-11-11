<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductSpec;
use App\Models\SpecDefinition;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ProductSpec>
 */
class ProductSpecFactory extends Factory
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
            'spec_definition_id' => SpecDefinition::factory(),
            'value_text' => Str::limit(fake()->words(2, true), 500, ''),
            'value_number' => null,
            'value_bool' => null,
        ];
    }

    /**
     * Populate the text spec column and clear typed alternatives.
     */
    public function textValue(?string $value = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'value_text' => $value ?? Str::limit(fake()->words(2, true), 500, ''),
            'value_number' => null,
            'value_bool' => null,
        ]);
    }

    /**
     * Populate the numeric spec column and clear typed alternatives.
     */
    public function numericValue(?float $value = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'value_text' => null,
            'value_number' => $value ?? (float) fake()->numberBetween(1, 512),
            'value_bool' => null,
        ]);
    }

    /**
     * Populate the boolean spec column and clear typed alternatives.
     */
    public function booleanValue(bool $value = true): static
    {
        return $this->state(fn (array $attributes): array => [
            'value_text' => null,
            'value_number' => null,
            'value_bool' => $value,
        ]);
    }
}
