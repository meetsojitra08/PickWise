<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

test('login is throttled after 5 attempts per minute per IP and normalized email', function (): void {
    User::factory()->create([
        'email' => 'throttle@example.com',
        'password' => Hash::make('CorrectPass123!'),
    ]);

    $client = $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.1']);

    $emailVariants = [
        'throttle@example.com',
        'THROTTLE@Example.com',
        '  throttle@example.com  ',
        'Throttle@example.com',
        'throttle@EXAMPLE.COM',
    ];

    foreach ($emailVariants as $index => $emailVariant) {
        $client->postJson('/api/v1/auth/login', [
            'email' => $emailVariant,
            'password' => 'WrongPass123!',
        ])
            ->assertStatus(422)
            ->assertHeader('X-RateLimit-Limit', '5')
            ->assertHeader('X-RateLimit-Remaining', (string) (4 - $index))
            ->assertJsonPath('error.message', 'Email or password is incorrect.');
    }

    $blocked = $client->withHeader('X-Request-Id', 'req-login-429')
        ->postJson('/api/v1/auth/login', [
            'email' => 'throttle@example.com',
            'password' => 'CorrectPass123!',
        ]);

    $blocked->assertStatus(429)
        ->assertHeader('X-Request-Id', 'req-login-429')
        ->assertHeader('Retry-After')
        ->assertHeader('X-RateLimit-Limit', '5')
        ->assertHeader('X-RateLimit-Remaining', '0')
        ->assertExactJson([
            'error' => [
                'code' => 'rate_limited',
                'message' => 'Too many attempts. Try again in a minute.',
                'request_id' => 'req-login-429',
            ],
        ]);

    $this->assertGuest();
});

test('login throttle is scoped separately per email and client IP', function (): void {
    User::factory()->create([
        'email' => 'alice@example.com',
        'password' => Hash::make('AlicePass123!'),
    ]);

    User::factory()->create([
        'email' => 'bob@example.com',
        'password' => Hash::make('BobPass123!'),
    ]);

    $firstIp = $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.10']);

    for ($attempt = 0; $attempt < 5; $attempt++) {
        $firstIp->postJson('/api/v1/auth/login', [
            'email' => 'alice@example.com',
            'password' => 'WrongPass123!',
        ])->assertStatus(422);
    }

    $firstIp->postJson('/api/v1/auth/login', [
        'email' => 'alice@example.com',
        'password' => 'AlicePass123!',
    ])->assertStatus(429);

    $firstIp->postJson('/api/v1/auth/login', [
        'email' => 'bob@example.com',
        'password' => 'BobPass123!',
    ])
        ->assertOk()
        ->assertJsonPath('data.email', 'bob@example.com');

    $this->postJson('/api/v1/auth/logout')->assertOk();

    $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.11'])
        ->postJson('/api/v1/auth/login', [
            'email' => 'alice@example.com',
            'password' => 'AlicePass123!',
        ])
        ->assertOk()
        ->assertJsonPath('data.email', 'alice@example.com');
});

test('login throttle resets after one minute decay window', function (): void {
    User::factory()->create([
        'email' => 'decay@example.com',
        'password' => Hash::make('DecayPass123!'),
    ]);

    $client = $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.20']);

    for ($attempt = 0; $attempt < 5; $attempt++) {
        $client->postJson('/api/v1/auth/login', [
            'email' => 'decay@example.com',
            'password' => 'WrongPass123!',
        ])->assertStatus(422);
    }

    $client->postJson('/api/v1/auth/login', [
        'email' => 'decay@example.com',
        'password' => 'DecayPass123!',
    ])->assertStatus(429);

    $this->travel(61)->seconds();

    $client->postJson('/api/v1/auth/login', [
        'email' => 'decay@example.com',
        'password' => 'DecayPass123!',
    ])
        ->assertOk()
        ->assertJsonPath('data.email', 'decay@example.com');
});

test('register is throttled at 5 attempts per hour per IP', function (): void {
    $client = $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.30']);

    for ($attempt = 1; $attempt <= 5; $attempt++) {
        $client->postJson('/api/v1/auth/register', [
            'name' => 'User '.$attempt,
            'email' => "register{$attempt}@example.com",
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
        ])
            ->assertCreated()
            ->assertHeader('X-RateLimit-Limit', '5')
            ->assertHeader('X-RateLimit-Remaining', (string) (5 - $attempt));

        $client->postJson('/api/v1/auth/logout')->assertOk();
    }

    $client->withHeader('X-Request-Id', 'req-register-429')
        ->postJson('/api/v1/auth/register', [
            'name' => 'User 6',
            'email' => 'register6@example.com',
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
        ])
        ->assertStatus(429)
        ->assertHeader('Retry-After')
        ->assertExactJson([
            'error' => [
                'code' => 'rate_limited',
                'message' => 'Too many registration attempts. Please try again later.',
                'request_id' => 'req-register-429',
            ],
        ]);

    $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.31'])
        ->postJson('/api/v1/auth/register', [
            'name' => 'Other IP User',
            'email' => 'other-ip@example.com',
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
        ])
        ->assertCreated();

    $this->postJson('/api/v1/auth/logout')->assertOk();

    $this->travel(61)->minutes();

    $client->postJson('/api/v1/auth/register', [
        'name' => 'User After Hour',
        'email' => 'after-hour@example.com',
        'password' => 'StrongPass123!',
        'password_confirmation' => 'StrongPass123!',
    ])->assertCreated();
});
