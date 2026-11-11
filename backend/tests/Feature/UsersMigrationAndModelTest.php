<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('users table contains pickwise columns and role index', function (): void {
    expect(Schema::hasColumns('users', [
        'id',
        'name',
        'email',
        'email_verified_at',
        'password',
        'role',
        'preferences',
        'is_active',
        'remember_token',
        'created_at',
        'updated_at',
    ]))->toBeTrue()
        ->and(Schema::hasIndex('users', ['email'], 'unique'))->toBeTrue()
        ->and(Schema::hasIndex('users', ['role']))->toBeTrue();

    if (DB::getDriverName() === 'pgsql') {
        $columns = collect(DB::select(
            "SELECT column_name, data_type, character_maximum_length, is_nullable
             FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'users'"
        ))->keyBy('column_name');

        expect($columns->get('name')?->character_maximum_length)->toBe(120)
            ->and($columns->get('role')?->character_maximum_length)->toBe(20)
            ->and($columns->get('preferences')?->data_type)->toBe('jsonb')
            ->and($columns->get('preferences')?->is_nullable)->toBe('YES')
            ->and($columns->get('is_active')?->data_type)->toBe('boolean');
    }
});

test('creating a user applies default customer role and active status', function (): void {
    $user = User::create([
        'name' => 'Asha Verma',
        'email' => 'asha@example.com',
        'password' => 'secret-password-123',
    ]);

    expect($user->role)->toBe(UserRole::Customer)
        ->and($user->isCustomer())->toBeTrue()
        ->and($user->isAdmin())->toBeFalse()
        ->and($user->isActive())->toBeTrue()
        ->and($user->preferences)->toBeNull();

    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'email' => 'asha@example.com',
        'role' => UserRole::Customer->value,
        'is_active' => true,
    ]);
});

test('role and is_active cannot be mass assigned', function (): void {
    $user = User::create([
        'name' => 'Rohan Mehta',
        'email' => 'rohan@example.com',
        'password' => 'secret-password-123',
        'role' => UserRole::Admin->value,
        'is_active' => false,
    ]);

    $fresh = $user->fresh();

    expect($fresh)->not->toBeNull()
        ->and($fresh?->role)->toBe(UserRole::Customer)
        ->and($fresh?->isActive())->toBeTrue();

    $fresh?->fill([
        'name' => 'Rohan Updated',
        'role' => UserRole::Admin->value,
        'is_active' => false,
    ])->save();

    $reloaded = $user->fresh();

    expect($reloaded?->name)->toBe('Rohan Updated')
        ->and($reloaded?->role)->toBe(UserRole::Customer)
        ->and($reloaded?->isActive())->toBeTrue();
});

test('preferences are mass assignable and cast to and from json', function (): void {
    $preferences = [
        'budget_default' => 85000,
        'favourite_categories' => ['laptops', 'monitors'],
        'priorities' => ['battery', 'display'],
    ];

    $user = User::create([
        'name' => 'Priya Nair',
        'email' => 'priya@example.com',
        'password' => 'secret-password-123',
        'preferences' => $preferences,
    ]);

    expect($user->fresh()?->preferences)->toEqual($preferences);
});

test('user factory supports admin, inactive, and preferences states', function (): void {
    $customer = User::factory()->create();
    $admin = User::factory()->admin()->create();
    $inactive = User::factory()->inactive()->create();
    $configured = User::factory()->withPreferences([
        'budget_default' => 30000,
        'favourite_categories' => ['headphones'],
        'priorities' => ['anc'],
    ])->create();

    expect($customer->role)->toBe(UserRole::Customer)
        ->and($customer->isActive())->toBeTrue()
        ->and($admin->role)->toBe(UserRole::Admin)
        ->and($admin->isAdmin())->toBeTrue()
        ->and($inactive->isActive())->toBeFalse()
        ->and($configured->fresh()?->preferences)->toEqual([
            'budget_default' => 30000,
            'favourite_categories' => ['headphones'],
            'priorities' => ['anc'],
        ]);
});

test('explicit role and active state updates persist via enum cast', function (): void {
    $user = User::factory()->create();

    $user->role = UserRole::Admin;
    $user->is_active = false;
    $user->save();

    $reloaded = $user->fresh();

    expect($reloaded?->role)->toBe(UserRole::Admin)
        ->and($reloaded?->isAdmin())->toBeTrue()
        ->and($reloaded?->isActive())->toBeFalse();
});
