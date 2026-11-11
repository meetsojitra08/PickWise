<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\SpecDataType;
use App\Models\Category;
use App\Models\SpecDefinition;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<SpecDefinition>
 */
class SpecDefinitionFactory extends Factory
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
            'key' => 'spec_'.fake()->unique()->lexify('????????'),
            'label' => fn (array $attributes): string => Str::headline((string) $attributes['key']),
            'unit' => null,
            'data_type' => SpecDataType::Text->value,
            'is_filterable' => false,
            'is_comparable' => false,
            'higher_is_better' => null,
            'sort_order' => 0,
        ];
    }

    /**
     * Configure the spec definition as numeric with an optional unit and winner direction.
     */
    public function numeric(?string $unit = null, ?bool $higherIsBetter = true): static
    {
        return $this->state(fn (array $attributes): array => [
            'data_type' => SpecDataType::Number->value,
            'unit' => $unit,
            'higher_is_better' => $higherIsBetter,
        ]);
    }

    /**
     * Configure the spec definition as boolean.
     */
    public function boolean(?bool $higherIsBetter = true): static
    {
        return $this->state(fn (array $attributes): array => [
            'data_type' => SpecDataType::Boolean->value,
            'unit' => null,
            'higher_is_better' => $higherIsBetter,
        ]);
    }

    /**
     * Configure the spec definition as plain text.
     */
    public function text(): static
    {
        return $this->state(fn (array $attributes): array => [
            'data_type' => SpecDataType::Text->value,
            'unit' => null,
            'higher_is_better' => null,
        ]);
    }

    /**
     * Mark the spec definition as shown in category filter facets.
     */
    public function filterable(): static
    {
        return $this->state(fn (array $attributes): array => [
            'is_filterable' => true,
        ]);
    }

    /**
     * Mark the spec definition as shown in product comparisons.
     */
    public function comparable(?bool $higherIsBetter = null): static
    {
        $hasExplicitDirection = func_num_args() > 0;

        return $this->state(fn (array $attributes): array => [
            'is_comparable' => true,
            'higher_is_better' => $hasExplicitDirection
                ? $higherIsBetter
                : ($attributes['higher_is_better'] ?? null),
        ]);
    }
}
