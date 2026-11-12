<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $user = User::query()->firstOrNew(['email' => 'test@example.com']);

        if (! $user->exists) {
            $user->fill([
                'name' => 'Test User',
                'password' => Hash::make('password'),
            ]);
            $user->email_verified_at = now();
            $user->role = UserRole::Customer;
            $user->is_active = true;
            $user->save();
        }

        $this->call([
            CatalogSeeder::class,
            ReviewSeeder::class,
        ]);
    }
}
