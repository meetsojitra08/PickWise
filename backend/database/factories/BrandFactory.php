<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Brand;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Brand>
 */
class BrandFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => Str::limit(fake()->unique()->company(), 255, ''),
            'slug' => function (array $attributes): string {
                $base = Str::slug((string) $attributes['name']);

                return ($base !== '' ? $base : 'brand').'-'.fake()->unique()->numberBetween(100, 99999);
            },
            'logo_path' => null,
        ];
    }

    /**
     * Attach a logo path to the brand.
     */
    public function withLogo(?string $path = null): static
    {
        return $this->state([
            'logo_path' => $path ?? static function (array $attributes): string {
                $base = Str::slug((string) $attributes['name']);

                return 'brands/'.($base !== '' ? $base : 'brand').'.svg';
            },
        ]);
    }
}
