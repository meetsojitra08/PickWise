<?php

declare(strict_types=1);

use App\Enums\AiFeature;
use App\Enums\AiUsageStatus;
use App\Http\Responses\ApiResponse;
use App\Models\AiUsageLog;
use App\Models\User;
use App\Services\AiQuotaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Route::middleware('ai-quota:assistant')->post('/api/v1/_test/ai-call', function (Request $request): JsonResponse {
        app(AiQuotaService::class)->consume($request);

        return ApiResponse::success(['ok' => true]);
    });
});

test('guests see the guest daily quota and the UTC reset time', function (): void {
    $this->travelTo('2026-11-14 13:30:00');

    $this->getJson('/api/v1/assistant/quota')
        ->assertOk()
        ->assertJsonPath('data.limit', 5)
        ->assertJsonPath('data.used', 0)
        ->assertJsonPath('data.remaining', 5)
        ->assertJsonPath('data.resets_at', '2026-11-15T00:00:00Z');
});

test('customers see the larger customer quota', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson('/api/v1/assistant/quota')
        ->assertOk()
        ->assertJsonPath('data.limit', 30)
        ->assertJsonPath('data.remaining', 30);
});

test('a successful call spends one guest use and the next call is blocked at the limit', function (): void {
    $this->travelTo('2026-11-14 13:30:00');

    config()->set('ai.daily_quota.guest', 1);

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.10'])
        ->postJson('/api/v1/_test/ai-call')
        ->assertOk();

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.10'])
        ->getJson('/api/v1/assistant/quota')
        ->assertJsonPath('data.used', 1)
        ->assertJsonPath('data.remaining', 0);

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.10'])
        ->postJson('/api/v1/_test/ai-call')
        ->assertStatus(429)
        ->assertHeader('Retry-After')
        ->assertJsonPath('error.code', 'ai_quota_exceeded')
        ->assertJsonPath('error.message', "You've used today's AI answers. Browse and filter products in the meantime.")
        ->assertJsonPath('error.details.limit', 1)
        ->assertJsonPath('error.details.remaining', 0)
        ->assertJsonPath('error.details.resets_at', '2026-11-15T00:00:00Z');

    $log = AiUsageLog::query()->sole();

    expect($log->status)->toBe(AiUsageStatus::RateLimited)
        ->and($log->feature)->toBe(AiFeature::Assistant)
        ->and($log->user_id)->toBeNull()
        ->and($log->error_code)->toBe('ai_quota_exceeded');
});

test('guests are counted separately by IP address', function (): void {
    config()->set('ai.daily_quota.guest', 1);

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.10'])
        ->postJson('/api/v1/_test/ai-call')
        ->assertOk();

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.10'])
        ->postJson('/api/v1/_test/ai-call')
        ->assertStatus(429);

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.11'])
        ->postJson('/api/v1/_test/ai-call')
        ->assertOk();
});

test('customers are counted separately and blocked independently', function (): void {
    config()->set('ai.daily_quota.user', 1);

    $alice = User::factory()->create();
    $bob = User::factory()->create();

    $this->actingAs($alice)
        ->postJson('/api/v1/_test/ai-call')
        ->assertOk();

    $this->actingAs($alice)
        ->postJson('/api/v1/_test/ai-call')
        ->assertStatus(429)
        ->assertJsonPath('error.code', 'ai_quota_exceeded');

    $this->actingAs($bob)
        ->postJson('/api/v1/_test/ai-call')
        ->assertOk();

    expect(AiUsageLog::query()->whereNotNull('user_id')->sole()->user_id)->toBe($alice->id);
});

test('the counter starts again on the next UTC day', function (): void {
    config()->set('ai.daily_quota.user', 1);

    $user = User::factory()->create();

    $this->travelTo('2026-11-14 23:59:00');

    $this->actingAs($user)
        ->postJson('/api/v1/_test/ai-call')
        ->assertOk();

    $this->actingAs($user)
        ->postJson('/api/v1/_test/ai-call')
        ->assertStatus(429);

    $this->travelTo('2026-11-15 00:00:01');

    $this->actingAs($user)
        ->getJson('/api/v1/assistant/quota')
        ->assertJsonPath('data.used', 0)
        ->assertJsonPath('data.remaining', 1);

    $this->actingAs($user)
        ->postJson('/api/v1/_test/ai-call')
        ->assertOk();
});

test('the middleware only guards and does not spend quota by itself', function (): void {
    config()->set('ai.daily_quota.guest', 1);

    Route::middleware('ai-quota:assistant')->post('/api/v1/_test/ai-guard', function (): JsonResponse {
        return ApiResponse::success(['ok' => true]);
    });

    $this->postJson('/api/v1/_test/ai-guard')->assertOk();
    $this->postJson('/api/v1/_test/ai-guard')->assertOk();

    $this->getJson('/api/v1/assistant/quota')
        ->assertJsonPath('data.used', 0)
        ->assertJsonPath('data.remaining', 1);
});
