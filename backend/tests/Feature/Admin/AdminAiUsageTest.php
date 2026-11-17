<?php

declare(strict_types=1);

use App\Enums\AiFeature;
use App\Enums\AiUsageStatus;
use App\Models\AiUsageLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Carbon::setTestNow('2026-11-16 12:00:00');
});

afterEach(function (): void {
    Carbon::setTestNow();
});

test('it rejects unauthenticated requests to ai usage analytics', function (): void {
    $response = $this->getJson('/api/v1/admin/ai/usage');

    $response->assertStatus(401)
        ->assertJsonPath('error.code', 'unauthenticated');
});

test('it rejects non-admin customers from viewing ai usage analytics', function (): void {
    $customer = User::factory()->create();

    $response = $this->actingAs($customer)->getJson('/api/v1/admin/ai/usage');

    $response->assertStatus(403)
        ->assertJsonPath('error.code', 'forbidden');
});

test('it rejects deactivated admins from viewing ai usage analytics', function (): void {
    $admin = User::factory()->admin()->inactive()->create();

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/ai/usage');

    $response->assertStatus(403)
        ->assertJsonPath('error.code', 'forbidden');
});

test('it returns zeroes and empty collections when no usage logs exist', function (): void {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/ai/usage');

    $response->assertOk()
        ->assertJsonPath('data.summary.total_calls', 0)
        ->assertJsonPath('data.summary.successful_calls', 0)
        ->assertJsonPath('data.summary.failed_calls', 0)
        ->assertJsonPath('data.summary.error_rate', 0)
        ->assertJsonPath('data.summary.total_tokens', 0)
        ->assertJsonPath('data.summary.avg_latency_ms', 0)
        ->assertJsonPath('data.guest_calls', 0)
        ->assertJsonPath('data.top_users', [])
        ->assertJsonPath('data.pagination.total', 0);
});

test('it aggregates summary metrics matching database records', function (): void {
    $admin = User::factory()->admin()->create();
    $userA = User::factory()->create(['name' => 'Alice']);
    $userB = User::factory()->create(['name' => 'Bob']);

    // Alice: 2 successful assistant calls
    AiUsageLog::factory()->create([
        'user_id' => $userA->id,
        'feature' => AiFeature::Assistant,
        'status' => AiUsageStatus::Ok,
        'prompt_tokens' => 100,
        'completion_tokens' => 50,
        'latency_ms' => 400,
        'created_at' => Carbon::now('UTC')->subDays(2),
    ]);
    AiUsageLog::factory()->create([
        'user_id' => $userA->id,
        'feature' => AiFeature::Assistant,
        'status' => AiUsageStatus::Ok,
        'prompt_tokens' => 200,
        'completion_tokens' => 100,
        'latency_ms' => 600,
        'created_at' => Carbon::now('UTC')->subDays(1),
    ]);

    // Bob: 1 compare error call
    AiUsageLog::factory()->create([
        'user_id' => $userB->id,
        'feature' => AiFeature::Compare,
        'status' => AiUsageStatus::Error,
        'prompt_tokens' => 150,
        'completion_tokens' => 0,
        'latency_ms' => 800,
        'error_code' => 'provider_timeout',
        'created_at' => Carbon::now('UTC')->subHours(4),
    ]);

    // Guest: 1 review summary rate-limited call
    AiUsageLog::factory()->guest()->rateLimited()->create([
        'feature' => AiFeature::ReviewSummary,
        'created_at' => Carbon::now('UTC')->subHours(2),
    ]);

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/ai/usage');

    $response->assertOk()
        ->assertJsonPath('data.summary.total_calls', 4)
        ->assertJsonPath('data.summary.successful_calls', 2)
        ->assertJsonPath('data.summary.failed_calls', 2)
        ->assertJsonPath('data.summary.error_calls', 1)
        ->assertJsonPath('data.summary.rate_limited_calls', 1)
        ->assertJsonPath('data.summary.error_rate', 50)
        ->assertJsonPath('data.summary.prompt_tokens', 450)
        ->assertJsonPath('data.summary.completion_tokens', 150)
        ->assertJsonPath('data.summary.total_tokens', 600)
        ->assertJsonPath('data.summary.avg_latency_ms', 600)
        ->assertJsonPath('data.guest_calls', 1);

    // Assert by_feature breakdown
    $features = collect($response->json('data.by_feature'))->keyBy('feature');
    expect($features->get('assistant')['total_calls'])->toBe(2)
        ->and($features->get('assistant')['successful_calls'])->toBe(2)
        ->and($features->get('compare')['total_calls'])->toBe(1)
        ->and($features->get('compare')['failed_calls'])->toBe(1)
        ->and($features->get('review_summary')['total_calls'])->toBe(1);

    // Assert top users
    $topUsers = $response->json('data.top_users');
    expect($topUsers)->toHaveCount(2)
        ->and($topUsers[0]['user_id'])->toBe($userA->id)
        ->and($topUsers[0]['total_calls'])->toBe(2)
        ->and($topUsers[0]['total_tokens'])->toBe(450)
        ->and($topUsers[1]['user_id'])->toBe($userB->id)
        ->and($topUsers[1]['total_calls'])->toBe(1);
});

test('it filters usage analytics by date range, feature, and status', function (): void {
    $admin = User::factory()->admin()->create();

    // Call outside date window (40 days ago)
    AiUsageLog::factory()->create([
        'feature' => AiFeature::Assistant,
        'status' => AiUsageStatus::Ok,
        'created_at' => Carbon::now('UTC')->subDays(40),
    ]);

    // Call within date window (5 days ago)
    AiUsageLog::factory()->create([
        'feature' => AiFeature::Assistant,
        'status' => AiUsageStatus::Ok,
        'created_at' => Carbon::now('UTC')->subDays(5),
    ]);

    // Error call within date window (3 days ago)
    AiUsageLog::factory()->create([
        'feature' => AiFeature::Compare,
        'status' => AiUsageStatus::Error,
        'created_at' => Carbon::now('UTC')->subDays(3),
    ]);

    // Query for last 7 days, assistant feature only
    $response = $this->actingAs($admin)->getJson('/api/v1/admin/ai/usage?'.http_build_query([
        'start_date' => Carbon::now('UTC')->subDays(7)->format('Y-m-d'),
        'end_date' => Carbon::now('UTC')->format('Y-m-d'),
        'feature' => 'assistant',
    ]));

    $response->assertOk()
        ->assertJsonPath('data.summary.total_calls', 1)
        ->assertJsonPath('data.summary.successful_calls', 1)
        ->assertJsonPath('data.pagination.total', 1);

    // Query with status filter = error
    $responseError = $this->actingAs($admin)->getJson('/api/v1/admin/ai/usage?'.http_build_query([
        'status' => 'error',
    ]));

    $responseError->assertOk()
        ->assertJsonPath('data.summary.total_calls', 1)
        ->assertJsonPath('data.summary.failed_calls', 1);
});

test('it validates date range limit of 90 days and chronological order', function (): void {
    $admin = User::factory()->admin()->create();

    // End date before start date
    $responseInvalidOrder = $this->actingAs($admin)->getJson('/api/v1/admin/ai/usage?'.http_build_query([
        'start_date' => '2026-11-10',
        'end_date' => '2026-11-05',
    ]));

    $responseInvalidOrder->assertStatus(422)
        ->assertJsonValidationErrors(['end_date'], 'error.details');

    // Range exceeding 90 days
    $responseExceeding = $this->actingAs($admin)->getJson('/api/v1/admin/ai/usage?'.http_build_query([
        'start_date' => '2026-05-01',
        'end_date' => '2026-11-01',
    ]));

    $responseExceeding->assertStatus(422)
        ->assertJsonValidationErrors(['start_date'], 'error.details');
});

test('it paginates individual usage logs', function (): void {
    $admin = User::factory()->admin()->create();

    AiUsageLog::factory()->count(15)->create([
        'feature' => AiFeature::Assistant,
        'created_at' => Carbon::now('UTC')->subHours(1),
    ]);

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/ai/usage?per_page=5&page=2');

    $response->assertOk()
        ->assertJsonPath('data.pagination.current_page', 2)
        ->assertJsonPath('data.pagination.per_page', 5)
        ->assertJsonPath('data.pagination.total', 15)
        ->assertJsonPath('data.pagination.last_page', 3)
        ->assertJsonCount(5, 'data.logs');
});
