<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function statefulOrigin(): string
{
    return (string) config('app.url', 'http://localhost:8080');
}

test('sanctum csrf cookie endpoint issues xsrf token cookie', function (): void {
    $response = $this->withHeader('Referer', statefulOrigin())
        ->get('/sanctum/csrf-cookie');

    $response->assertNoContent()
        ->assertCookie('XSRF-TOKEN');
});

test('visitor can register a customer account and immediately query auth me', function (): void {
    $response = $this->withHeader('Referer', statefulOrigin())
        ->postJson('/api/v1/auth/register', [
            'name' => '  Asha Verma  ',
            'email' => '  Asha.Verma@Example.COM  ',
            'password' => 'SecretPass123!',
            'password_confirmation' => 'SecretPass123!',
            'role' => UserRole::Admin->value,
            'is_active' => false,
        ]);

    $response->assertCreated()
        ->assertHeader('X-Request-Id')
        ->assertJsonPath('data.name', 'Asha Verma')
        ->assertJsonPath('data.email', 'asha.verma@example.com')
        ->assertJsonPath('data.role', UserRole::Customer->value)
        ->assertJsonPath('data.preferences', null)
        ->assertJsonPath('data.is_active', true)
        ->assertJsonPath('data.email_verified_at', null);

    $payload = $response->json('data');
    expect($payload)->toBeArray()
        ->and($payload)->not->toHaveKeys(['password', 'remember_token', 'token'])
        ->and($payload['created_at'])->toBeString()
        ->and(Carbon::parse($payload['created_at'])->toIso8601ZuluString())->toBe($payload['created_at']);

    $this->assertDatabaseHas('users', [
        'email' => 'asha.verma@example.com',
        'name' => 'Asha Verma',
        'role' => UserRole::Customer->value,
        'is_active' => true,
    ]);

    $this->assertAuthenticated();

    $this->withHeader('Referer', statefulOrigin())
        ->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.email', 'asha.verma@example.com')
        ->assertJsonPath('data.role', UserRole::Customer->value);
});

test('register validates name, unique case-insensitive email, and confirmed password', function (): void {
    User::factory()->create(['email' => 'existing@example.com']);

    $this->postJson('/api/v1/auth/register', [
        'name' => 'A',
        'email' => 'not-an-email',
        'password' => 'short',
        'password_confirmation' => 'mismatch',
    ])
        ->assertStatus(422)
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonStructure([
            'error' => [
                'code',
                'message',
                'details' => ['name', 'email', 'password'],
                'request_id',
            ],
        ]);

    $this->postJson('/api/v1/auth/register', [
        'name' => 'Another User',
        'email' => 'EXISTING@Example.com',
        'password' => 'ValidPass123!',
        'password_confirmation' => 'ValidPass123!',
    ])
        ->assertStatus(422)
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonStructure([
            'error' => [
                'details' => ['email'],
            ],
        ]);

    $this->assertGuest();
});

test('user can login with case-insensitive email, regenerates session, and supports remember me', function (): void {
    $user = User::factory()->admin()->withPreferences([
        'budget_default' => 90000,
        'favourite_categories' => ['laptops'],
        'priorities' => ['performance'],
    ])->create([
        'email' => 'admin.user@example.com',
        'password' => Hash::make('StrongPass123!'),
    ]);

    $this->withHeader('Referer', statefulOrigin())
        ->get('/sanctum/csrf-cookie')
        ->assertNoContent();

    $initialSessionId = session()->getId();

    $loginResponse = $this->withHeader('Referer', statefulOrigin())
        ->postJson('/api/v1/auth/login', [
            'email' => '  ADMIN.User@Example.COM ',
            'password' => 'StrongPass123!',
            'remember' => true,
        ]);

    $loginResponse->assertOk()
        ->assertHeader('X-Request-Id')
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.email', 'admin.user@example.com')
        ->assertJsonPath('data.role', UserRole::Admin->value)
        ->assertJsonPath('data.preferences.budget_default', 90000);

    expect($loginResponse->json('data'))->not->toHaveKeys(['password', 'remember_token', 'token'])
        ->and(session()->getId())->not->toBe($initialSessionId);

    $this->assertAuthenticatedAs($user, 'web');
    expect($user->fresh()?->getRememberToken())->not->toBeNull();

    $this->withHeader('Referer', statefulOrigin())
        ->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.role', UserRole::Admin->value);
});

test('login returns generic 422 message for wrong password or unknown email', function (): void {
    User::factory()->create([
        'email' => 'customer@example.com',
        'password' => Hash::make('CorrectPass123!'),
    ]);

    $wrongPassword = $this->postJson('/api/v1/auth/login', [
        'email' => 'customer@example.com',
        'password' => 'WrongPass123!',
    ]);

    $unknownEmail = $this->postJson('/api/v1/auth/login', [
        'email' => 'nobody@example.com',
        'password' => 'WrongPass123!',
    ]);

    $wrongPassword->assertStatus(422)
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonPath('error.message', 'Email or password is incorrect.')
        ->assertJsonPath('error.details.email.0', 'Email or password is incorrect.');

    $unknownEmail->assertStatus(422)
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonPath('error.message', 'Email or password is incorrect.')
        ->assertJsonPath('error.details.email.0', 'Email or password is incorrect.');

    $this->assertGuest();
});

test('deactivated user cannot log in', function (): void {
    User::factory()->inactive()->create([
        'email' => 'inactive@example.com',
        'password' => Hash::make('CorrectPass123!'),
    ]);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'inactive@example.com',
        'password' => 'WrongPass123!',
    ])
        ->assertStatus(422)
        ->assertJsonPath('error.message', 'Email or password is incorrect.');

    $this->postJson('/api/v1/auth/login', [
        'email' => 'inactive@example.com',
        'password' => 'CorrectPass123!',
    ])
        ->assertStatus(422)
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonPath('error.message', 'Your account has been deactivated.')
        ->assertJsonPath('error.details.email.0', 'Your account has been deactivated.');

    $this->assertGuest();
});

test('login validates required email and password', function (): void {
    $this->postJson('/api/v1/auth/login', [
        'email' => 'invalid',
        'password' => '',
    ])
        ->assertStatus(422)
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonStructure([
            'error' => [
                'details' => ['email', 'password'],
            ],
        ]);
});

test('auth me and logout require authentication', function (): void {
    $this->withHeader('X-Request-Id', 'req-me-unauth')
        ->getJson('/api/v1/auth/me')
        ->assertUnauthorized()
        ->assertExactJson([
            'error' => [
                'code' => 'unauthenticated',
                'message' => 'Unauthenticated.',
                'request_id' => 'req-me-unauth',
            ],
        ]);

    $this->withHeader('X-Request-Id', 'req-logout-unauth')
        ->postJson('/api/v1/auth/logout')
        ->assertUnauthorized()
        ->assertExactJson([
            'error' => [
                'code' => 'unauthenticated',
                'message' => 'Unauthenticated.',
                'request_id' => 'req-logout-unauth',
            ],
        ]);
});

test('auth me returns 200 ok for newly created actingAs user', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.email', $user->email)
        ->assertJsonPath('data.role', UserRole::Customer->value);
});

test('authenticated user can logout and subsequent auth me requests fail with 401', function (): void {
    $user = User::factory()->create([
        'email' => 'logout.user@example.com',
        'password' => Hash::make('SecretPass123!'),
    ]);

    $this->withHeader('Referer', statefulOrigin())
        ->postJson('/api/v1/auth/login', [
            'email' => 'logout.user@example.com',
            'password' => 'SecretPass123!',
        ])
        ->assertOk();

    $sessionIdBeforeLogout = session()->getId();
    $csrfTokenBeforeLogout = session()->token();

    $this->withHeader('Referer', statefulOrigin())
        ->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.id', $user->id);

    $this->withHeader('Referer', statefulOrigin())
        ->postJson('/api/v1/auth/logout')
        ->assertOk()
        ->assertExactJson([
            'data' => [
                'message' => 'Logged out.',
            ],
        ]);

    $this->assertGuest('web');
    expect(session()->getId())->not->toBe($sessionIdBeforeLogout)
        ->and(session()->token())->not->toBe($csrfTokenBeforeLogout);

    $this->withHeader('Referer', statefulOrigin())
        ->getJson('/api/v1/auth/me')
        ->assertUnauthorized();
});

test('state changing auth endpoints enforce csrf token outside unit test bypass', function (): void {
    User::factory()->create([
        'email' => 'csrf@example.com',
        'password' => Hash::make('SecretPass123!'),
    ]);

    $originalEnv = app()->environment();
    app()->instance('env', 'local');

    try {
        $this->withHeader('Origin', statefulOrigin())
            ->postJson('/api/v1/auth/login', [
                'email' => 'csrf@example.com',
                'password' => 'SecretPass123!',
            ])
            ->assertStatus(419)
            ->assertJsonPath('error.code', 'csrf_token_mismatch');

        $csrfResponse = $this->withHeader('Referer', statefulOrigin())
            ->get('/sanctum/csrf-cookie');

        $xsrfCookie = $csrfResponse->getCookie('XSRF-TOKEN', false);
        expect($xsrfCookie)->not->toBeNull();

        $this->withHeader('Origin', statefulOrigin())
            ->withHeader('X-XSRF-TOKEN', (string) $xsrfCookie?->getValue())
            ->withUnencryptedCookie('XSRF-TOKEN', (string) $xsrfCookie?->getValue())
            ->postJson('/api/v1/auth/login', [
                'email' => 'csrf@example.com',
                'password' => 'SecretPass123!',
            ])
            ->assertOk()
            ->assertJsonPath('data.email', 'csrf@example.com');
    } finally {
        app()->instance('env', $originalEnv);
    }
});
