<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

function accountStatefulOrigin(): string
{
    return (string) config('app.url', 'http://localhost:8080');
}

test('account endpoints require authentication', function (): void {
    $this->patchJson('/api/v1/account/profile', [
        'name' => 'Asha Verma',
        'email' => 'asha@example.com',
    ])
        ->assertUnauthorized()
        ->assertJsonPath('error.code', 'unauthenticated');

    $this->putJson('/api/v1/account/password', [
        'current_password' => 'SecretPass123!',
        'password' => 'NewSecretPass123!',
        'password_confirmation' => 'NewSecretPass123!',
    ])
        ->assertUnauthorized()
        ->assertJsonPath('error.code', 'unauthenticated');

    $this->putJson('/api/v1/account/preferences', [
        'budget_default' => 50000,
        'favourite_categories' => ['laptops'],
        'priorities' => ['battery'],
    ])
        ->assertUnauthorized()
        ->assertJsonPath('error.code', 'unauthenticated');
});

test('deactivated user is forbidden from updating profile, password, or preferences', function (): void {
    $inactiveUser = User::factory()->inactive()->create([
        'password' => Hash::make('SecretPass123!'),
    ]);

    $this->actingAs($inactiveUser)
        ->patchJson('/api/v1/account/profile', [
            'name' => 'Updated Name',
            'email' => $inactiveUser->email,
        ])
        ->assertForbidden()
        ->assertJsonPath('error.code', 'forbidden');

    $this->actingAs($inactiveUser)
        ->putJson('/api/v1/account/password', [
            'current_password' => 'SecretPass123!',
            'password' => 'NewSecretPass123!',
            'password_confirmation' => 'NewSecretPass123!',
        ])
        ->assertForbidden()
        ->assertJsonPath('error.code', 'forbidden');

    $this->actingAs($inactiveUser)
        ->putJson('/api/v1/account/preferences', [
            'budget_default' => 40000,
            'favourite_categories' => ['laptops'],
            'priorities' => ['price'],
        ])
        ->assertForbidden()
        ->assertJsonPath('error.code', 'forbidden');
});

test('user can update profile name and normalized email and ignore non-fillable attributes', function (): void {
    $user = User::factory()->create([
        'name' => 'Asha Verma',
        'email' => 'asha@example.com',
    ]);

    $response = $this->actingAs($user)
        ->patchJson('/api/v1/account/profile', [
            'name' => '  Asha Mehta  ',
            'email' => '  Asha.Mehta@Example.COM  ',
            'role' => UserRole::Admin->value,
            'is_active' => false,
        ]);

    $response->assertOk()
        ->assertHeader('X-Request-Id')
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.name', 'Asha Mehta')
        ->assertJsonPath('data.email', 'asha.mehta@example.com')
        ->assertJsonPath('data.role', UserRole::Customer->value)
        ->assertJsonPath('data.is_active', true);

    expect($response->json('data'))->not->toHaveKeys(['password', 'remember_token', 'token']);

    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'name' => 'Asha Mehta',
        'email' => 'asha.mehta@example.com',
        'role' => UserRole::Customer->value,
        'is_active' => true,
    ]);
});

test('user can update name while keeping own email regardless of casing', function (): void {
    $user = User::factory()->create([
        'name' => 'Rohan Mehta',
        'email' => 'rohan@example.com',
    ]);

    $this->actingAs($user)
        ->patchJson('/api/v1/account/profile', [
            'name' => 'Rohan K. Mehta',
            'email' => 'ROHAN@Example.com',
        ])
        ->assertOk()
        ->assertJsonPath('data.name', 'Rohan K. Mehta')
        ->assertJsonPath('data.email', 'rohan@example.com');
});

test('profile update validates fields and rejects duplicate email case-insensitively', function (): void {
    User::factory()->create(['email' => 'taken@example.com']);
    $user = User::factory()->create([
        'name' => 'Priya Nair',
        'email' => 'priya@example.com',
    ]);

    $this->actingAs($user)
        ->patchJson('/api/v1/account/profile', [
            'name' => 'P',
            'email' => 'not-an-email',
        ])
        ->assertStatus(422)
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonStructure([
            'error' => [
                'details' => ['name', 'email'],
            ],
        ]);

    $this->actingAs($user)
        ->patchJson('/api/v1/account/profile', [
            'name' => 'Priya Nair',
            'email' => 'TAKEN@Example.com',
        ])
        ->assertStatus(422)
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonStructure([
            'error' => [
                'details' => ['email'],
            ],
        ]);

    expect($user->fresh()?->email)->toBe('priya@example.com');
});

test('authenticated user can change password in stateful session and log in with the new password', function (): void {
    $user = User::factory()->create([
        'email' => 'security@example.com',
        'password' => Hash::make('OldSecret123!'),
        'remember_token' => 'initial-remember-token',
    ]);

    $this->withHeader('Referer', accountStatefulOrigin())
        ->postJson('/api/v1/auth/login', [
            'email' => 'security@example.com',
            'password' => 'OldSecret123!',
        ])
        ->assertOk();

    $sessionIdBeforeChange = session()->getId();

    $this->withHeader('Referer', accountStatefulOrigin())
        ->putJson('/api/v1/account/password', [
            'current_password' => 'OldSecret123!',
            'password' => 'NewSecret456!',
            'password_confirmation' => 'NewSecret456!',
        ])
        ->assertOk()
        ->assertExactJson([
            'data' => [
                'message' => 'Password updated.',
            ],
        ]);

    $reloaded = $user->fresh();
    expect($reloaded)->not->toBeNull()
        ->and(Hash::check('NewSecret456!', (string) $reloaded?->password))->toBeTrue()
        ->and($reloaded?->getRememberToken())->not->toBe('initial-remember-token')
        ->and(session()->getId())->not->toBe($sessionIdBeforeChange);

    // Current SPA session stays valid after password change because Sanctum updates password_hash_web.
    $this->withHeader('Referer', accountStatefulOrigin())
        ->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.id', $user->id);

    $this->withHeader('Referer', accountStatefulOrigin())
        ->postJson('/api/v1/auth/logout')
        ->assertOk();

    $this->postJson('/api/v1/auth/login', [
        'email' => 'security@example.com',
        'password' => 'OldSecret123!',
    ])->assertStatus(422);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'security@example.com',
        'password' => 'NewSecret456!',
    ])
        ->assertOk()
        ->assertJsonPath('data.id', $user->id);
});

test('wrong current password or identical new password blocks password change with validation errors', function (): void {
    $user = User::factory()->create([
        'password' => Hash::make('CurrentPass123!'),
    ]);

    $this->actingAs($user)
        ->putJson('/api/v1/account/password', [
            'current_password' => 'WrongPass123!',
            'password' => 'BrandNewPass456!',
            'password_confirmation' => 'BrandNewPass456!',
        ])
        ->assertStatus(422)
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonPath('error.details.current_password.0', 'The current password is incorrect.');

    $this->actingAs($user)
        ->putJson('/api/v1/account/password', [
            'current_password' => 'CurrentPass123!',
            'password' => 'CurrentPass123!',
            'password_confirmation' => 'CurrentPass123!',
        ])
        ->assertStatus(422)
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonPath(
            'error.details.password.0',
            'New password must be different from your current password.',
        );

    $this->actingAs($user)
        ->putJson('/api/v1/account/password', [
            'current_password' => 'CurrentPass123!',
            'password' => 'short',
            'password_confirmation' => 'mismatch',
        ])
        ->assertStatus(422)
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonStructure([
            'error' => [
                'details' => ['password'],
            ],
        ]);

    expect(Hash::check('CurrentPass123!', (string) $user->fresh()?->password))->toBeTrue();
});

test('user can save and clear shopping preferences', function (): void {
    $user = User::factory()->create();

    $saveResponse = $this->actingAs($user)
        ->putJson('/api/v1/account/preferences', [
            'budget_default' => 90000,
            'favourite_categories' => ['  Laptops ', 'monitors'],
            'priorities' => ['  battery  ', 'display', 'price'],
        ]);

    $saveResponse->assertOk()
        ->assertJsonPath('data.preferences.budget_default', 90000)
        ->assertJsonPath('data.preferences.favourite_categories', ['laptops', 'monitors'])
        ->assertJsonPath('data.preferences.priorities', ['battery', 'display', 'price']);

    expect($saveResponse->json('data.preferences'))
        ->toHaveCount(3)
        ->and($user->fresh()?->preferences)->toEqual([
            'budget_default' => 90000,
            'favourite_categories' => ['laptops', 'monitors'],
            'priorities' => ['battery', 'display', 'price'],
        ]);

    $zeroBudgetResponse = $this->actingAs($user)
        ->putJson('/api/v1/account/preferences', [
            'budget_default' => 0,
            'favourite_categories' => [],
            'priorities' => [],
        ]);

    $zeroBudgetResponse->assertOk()
        ->assertJsonPath('data.preferences.budget_default', 0)
        ->assertJsonPath('data.preferences.favourite_categories', [])
        ->assertJsonPath('data.preferences.priorities', []);

    expect($zeroBudgetResponse->json('data.preferences'))->toHaveCount(3);

    $clearResponse = $this->actingAs($user)
        ->putJson('/api/v1/account/preferences', [
            'budget_default' => null,
            'favourite_categories' => [],
            'priorities' => [],
        ]);

    $clearResponse->assertOk()
        ->assertJsonPath('data.preferences', null);

    expect($user->fresh()?->preferences)->toBeNull();
});

test('preferences validate negative budget, max five priorities, duplicates, and category values', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->putJson('/api/v1/account/preferences', [
            'budget_default' => -100,
            'favourite_categories' => ['Not A Slug!'],
            'priorities' => ['price', 'battery', 'display', 'weight', 'audio', 'camera'],
        ])
        ->assertStatus(422)
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonStructure([
            'error' => [
                'details' => ['budget_default', 'favourite_categories.0', 'priorities'],
            ],
        ]);

    $this->actingAs($user)
        ->putJson('/api/v1/account/preferences', [
            'budget_default' => 50000,
            'favourite_categories' => ['laptops', 'laptops'],
            'priorities' => ['Battery', 'battery'],
        ])
        ->assertStatus(422)
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonStructure([
            'error' => [
                'details' => ['favourite_categories.0', 'priorities.0'],
            ],
        ]);
});

test('preferences enforce existing active category slugs once categories table is populated', function (): void {
    $user = User::factory()->create();
    $createdTemporaryTable = false;

    if (! Schema::hasTable('categories')) {
        Schema::create('categories', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 120);
            $table->string('slug')->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        $createdTemporaryTable = true;
    }

    try {
        DB::table('categories')->insertOrIgnore([
            'name' => 'Laptops',
            'slug' => 'laptops',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($user)
            ->putJson('/api/v1/account/preferences', [
                'budget_default' => 75000,
                'favourite_categories' => ['nonexistent-category'],
                'priorities' => ['price'],
            ])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'validation_failed')
            ->assertJsonStructure([
                'error' => [
                    'details' => ['favourite_categories.0'],
                ],
            ]);

        $this->actingAs($user)
            ->putJson('/api/v1/account/preferences', [
                'budget_default' => 75000,
                'favourite_categories' => ['laptops'],
                'priorities' => ['price'],
            ])
            ->assertOk()
            ->assertJsonPath('data.preferences.favourite_categories', ['laptops']);
    } finally {
        if ($createdTemporaryTable) {
            Schema::dropIfExists('categories');
        }
    }
});
