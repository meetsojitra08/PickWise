<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\AiFeature;
use App\Enums\AiUsageStatus;
use App\Enums\ReviewStatus;
use App\Enums\UserRole;
use App\Models\AdminActivityLog;
use App\Models\AiUsageLog;
use App\Models\Category;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

it('rejects unauthenticated requests to the admin dashboard', function (): void {
    $response = $this->getJson('/api/v1/admin/dashboard');

    $response->assertUnauthorized()
        ->assertJsonPath('error.code', 'unauthenticated');
});

it('rejects non-admin customers from accessing the admin dashboard', function (): void {
    $customer = User::factory()->create([
        'role' => UserRole::Customer,
        'is_active' => true,
    ]);

    $response = $this->actingAs($customer)->getJson('/api/v1/admin/dashboard');

    $response->assertForbidden()
        ->assertJsonPath('error.code', 'forbidden');
});

it('rejects deactivated admins from accessing the admin dashboard', function (): void {
    $deactivatedAdmin = User::factory()->admin()->inactive()->create();

    $response = $this->actingAs($deactivatedAdmin)->getJson('/api/v1/admin/dashboard');

    $response->assertForbidden()
        ->assertJsonPath('error.code', 'forbidden');
});

it('returns aggregated KPI tiles, AI usage today, recent activity, and pending reviews for active admin', function (): void {
    Carbon::setTestNow('2026-11-16 12:00:00');

    $admin = User::factory()->admin()->create([
        'name' => 'Lead Admin',
        'email' => 'admin@pickwise.test',
        'is_active' => true,
    ]);

    $category = Category::factory()->create();

    // Products: 2 published, 1 unpublished
    Product::factory()->create([
        'category_id' => $category->id,
        'is_published' => true,
    ]);
    Product::factory()->create([
        'category_id' => $category->id,
        'is_published' => true,
    ]);
    Product::factory()->create([
        'category_id' => $category->id,
        'is_published' => false,
    ]);

    // Users: 2 customers (1 active, 1 inactive), plus the 1 admin created above
    User::factory()->create(['role' => UserRole::Customer, 'is_active' => true]);
    User::factory()->inactive()->create(['role' => UserRole::Customer]);

    // Reviews: 2 pending, 1 approved across distinct users
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();
    $user3 = User::factory()->create();

    $productForReview = Product::query()->firstOrFail();
    Review::query()->create([
        'product_id' => $productForReview->id,
        'user_id' => $user1->id,
        'author_name' => 'Shopper One',
        'rating' => 5,
        'title' => 'Pending review 1',
        'body' => 'Needs moderation.',
        'status' => ReviewStatus::Pending,
    ]);
    Review::query()->create([
        'product_id' => $productForReview->id,
        'user_id' => $user2->id,
        'author_name' => 'Shopper Two',
        'rating' => 4,
        'title' => 'Pending review 2',
        'body' => 'Also needs moderation.',
        'status' => ReviewStatus::Pending,
    ]);
    $approvedReview = Review::query()->create([
        'product_id' => $productForReview->id,
        'user_id' => $user3->id,
        'author_name' => 'Shopper Three',
        'rating' => 5,
        'title' => 'Approved review',
        'body' => 'Already approved.',
    ]);
    $approvedReview->forceFill(['status' => ReviewStatus::Approved])->save();

    // AI usage logs: 2 today (1 ok, 1 error), 1 yesterday
    AiUsageLog::query()->create([
        'user_id' => $admin->id,
        'feature' => AiFeature::Assistant,
        'model' => 'llama-3.3-70b-versatile',
        'prompt_tokens' => 120,
        'completion_tokens' => 80,
        'latency_ms' => 200,
        'status' => AiUsageStatus::Ok,
        'created_at' => Carbon::now('UTC')->subHours(2),
    ]);
    AiUsageLog::query()->create([
        'user_id' => $admin->id,
        'feature' => AiFeature::Compare,
        'model' => 'llama-3.3-70b-versatile',
        'prompt_tokens' => 60,
        'completion_tokens' => 0,
        'latency_ms' => 400,
        'status' => AiUsageStatus::Error,
        'error_code' => 'provider_timeout',
        'created_at' => Carbon::now('UTC')->subHours(1),
    ]);
    AiUsageLog::query()->create([
        'user_id' => $admin->id,
        'feature' => AiFeature::Assistant,
        'model' => 'llama-3.3-70b-versatile',
        'prompt_tokens' => 300,
        'completion_tokens' => 200,
        'latency_ms' => 500,
        'status' => AiUsageStatus::Ok,
        'created_at' => Carbon::now('UTC')->subDays(2),
    ]);

    // Admin Activity Log
    AdminActivityLog::query()->create([
        'admin_id' => $admin->id,
        'action' => 'product.created',
        'subject_type' => $productForReview->getMorphClass(),
        'subject_id' => $productForReview->id,
        'changes' => ['after' => ['name' => $productForReview->name]],
        'ip_address' => '127.0.0.1',
        'created_at' => Carbon::now('UTC')->subMinutes(30),
    ]);

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/dashboard');

    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                'counts' => [
                    'products' => ['total', 'published', 'unpublished'],
                    'users' => ['total', 'active', 'customers', 'admins'],
                    'pending_reviews',
                    'ai_calls_today',
                ],
                'ai_usage_today' => [
                    'total_calls',
                    'successful_calls',
                    'failed_calls',
                    'total_tokens',
                    'avg_latency_ms',
                ],
                'recent_activity' => [
                    '*' => [
                        'id',
                        'admin' => ['id', 'name', 'email'],
                        'action',
                        'subject_type',
                        'subject_id',
                        'changes',
                        'ip_address',
                        'created_at',
                    ],
                ],
                'pending_reviews' => [
                    '*' => [
                        'id',
                        'product' => ['id', 'name', 'slug'],
                        'author_name',
                        'rating',
                        'title',
                        'body',
                        'created_at',
                    ],
                ],
            ],
        ]);

    $data = $response->json('data');

    expect($data['counts']['products']['total'])->toBe(3)
        ->and($data['counts']['products']['published'])->toBe(2)
        ->and($data['counts']['products']['unpublished'])->toBe(1)
        ->and($data['counts']['users']['total'])->toBe(6)
        ->and($data['counts']['users']['active'])->toBe(5)
        ->and($data['counts']['users']['customers'])->toBe(5)
        ->and($data['counts']['users']['admins'])->toBe(1)
        ->and($data['counts']['pending_reviews'])->toBe(2)
        ->and($data['counts']['ai_calls_today'])->toBe(2)
        ->and($data['ai_usage_today']['total_calls'])->toBe(2)
        ->and($data['ai_usage_today']['successful_calls'])->toBe(1)
        ->and($data['ai_usage_today']['failed_calls'])->toBe(1)
        ->and($data['ai_usage_today']['total_tokens'])->toBe(260)
        ->and($data['ai_usage_today']['avg_latency_ms'])->toBe(300)
        ->and($data['recent_activity'])->toHaveCount(1)
        ->and($data['recent_activity'][0]['admin']['name'])->toBe('Lead Admin')
        ->and($data['recent_activity'][0]['action'])->toBe('product.created')
        ->and($data['pending_reviews'])->toHaveCount(2);

    Carbon::setTestNow();
});
