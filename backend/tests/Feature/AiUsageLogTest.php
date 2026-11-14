<?php

declare(strict_types=1);

use App\AI\AiUsageLogger;
use App\Enums\AiFeature;
use App\Enums\AiUsageStatus;
use App\Models\AiUsageLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('ai_usage_logs has the documented columns and lookup indexes', function (): void {
    expect(Schema::hasColumns('ai_usage_logs', [
        'id',
        'user_id',
        'feature',
        'model',
        'prompt_tokens',
        'completion_tokens',
        'latency_ms',
        'status',
        'error_code',
        'created_at',
    ]))->toBeTrue()
        ->and(Schema::hasIndex('ai_usage_logs', ['user_id', 'created_at']))->toBeTrue()
        ->and(Schema::hasIndex('ai_usage_logs', ['feature', 'created_at']))->toBeTrue()
        ->and(Schema::hasColumn('ai_usage_logs', 'updated_at'))->toBeFalse();
});

test('usage logs cast enums and belong to a user without carrying timestamps', function (): void {
    $user = User::factory()->create();

    $log = AiUsageLog::factory()->for($user)->failed('connection')->create([
        'feature' => AiFeature::ReviewSummary,
        'model' => 'test-model',
    ]);

    expect($log->usesTimestamps())->toBeFalse()
        ->and($log->feature)->toBe(AiFeature::ReviewSummary)
        ->and($log->status)->toBe(AiUsageStatus::Error)
        ->and($log->error_code)->toBe('connection')
        ->and($log->prompt_tokens)->toBeInt()
        ->and($log->user->is($user))->toBeTrue()
        ->and($user->aiUsageLogs()->count())->toBe(1);
});

test('guest usage keeps a null user link', function (): void {
    $log = AiUsageLog::factory()->guest()->rateLimited()->create();

    expect($log->user_id)->toBeNull()
        ->and($log->user)->toBeNull()
        ->and($log->status)->toBe(AiUsageStatus::RateLimited)
        ->and($log->error_code)->toBe('ai_quota_exceeded')
        ->and($log->model)->toBeNull();
});

test('deleting a user keeps their usage history and clears the user id', function (): void {
    $user = User::factory()->create();
    $log = AiUsageLog::factory()->for($user)->create();

    $user->delete();

    expect($log->refresh()->user_id)->toBeNull()
        ->and(AiUsageLog::query()->count())->toBe(1);
});

test('the logger records successful and rate limited calls', function (): void {
    $user = User::factory()->create();
    $logger = app(AiUsageLogger::class);

    $success = $logger->record(
        feature: AiFeature::Assistant,
        status: AiUsageStatus::Ok,
        user: $user,
        model: 'test-model',
        promptTokens: 640,
        completionTokens: 210,
        latencyMs: 1450,
    );

    expect($success->user_id)->toBe($user->id)
        ->and($success->feature)->toBe(AiFeature::Assistant)
        ->and($success->status)->toBe(AiUsageStatus::Ok)
        ->and($success->prompt_tokens)->toBe(640)
        ->and($success->completion_tokens)->toBe(210)
        ->and($success->latency_ms)->toBe(1450)
        ->and($success->created_at)->not->toBeNull();
});
