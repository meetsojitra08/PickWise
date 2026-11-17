<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\AdminActivityLog;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AdminActivityLog>
 */
class AdminActivityLogFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'admin_id' => User::factory()->admin(),
            'action' => 'product.updated',
            'subject_type' => Product::class,
            'subject_id' => fake()->numberBetween(1, 1000),
            'changes' => [
                'before' => ['price' => '999.00'],
                'after' => ['price' => '899.00'],
            ],
            'ip_address' => fake()->ipv4(),
            'created_at' => now(),
        ];
    }
}
