<?php

declare(strict_types=1);

use App\Enums\AiFeature;
use App\Enums\AssistantReplyStatus;
use App\Enums\MessageRole;
use App\Enums\ReviewSentiment;
use App\Enums\UserRole;
use App\Models\AdminActivityLog;
use App\Models\AiConversation;
use App\Models\AiUsageLog;
use App\Models\Comparison;
use App\Models\Product;
use App\Models\ReviewSummary;
use App\Models\User;
use App\Models\WishlistItem;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('database seeder creates demo accounts with valid credentials and roles', function (): void {
    Storage::fake('public');
    $this->seed(DatabaseSeeder::class);

    $admin = User::query()->where('email', 'admin@pickwise.test')->first();
    expect($admin)->not->toBeNull()
        ->and($admin?->name)->toBe('Demo Admin')
        ->and($admin?->role)->toBe(UserRole::Admin)
        ->and($admin?->isAdmin())->toBeTrue()
        ->and($admin?->is_active)->toBeTrue()
        ->and($admin?->email_verified_at)->not->toBeNull();

    $customer = User::query()->where('email', 'customer@pickwise.test')->first();
    expect($customer)->not->toBeNull()
        ->and($customer?->name)->toBe('Demo Customer')
        ->and($customer?->role)->toBe(UserRole::Customer)
        ->and($customer?->isCustomer())->toBeTrue()
        ->and($customer?->is_active)->toBeTrue()
        ->and($customer?->email_verified_at)->not->toBeNull()
        ->and($customer?->preferences)->toMatchArray([
            'budget_default' => 150000,
            'favourite_categories' => ['laptops', 'smartphones', 'headphones'],
            'priorities' => ['battery_life', 'performance', 'value_for_money'],
        ]);

    $legacyUser = User::query()->where('email', 'test@example.com')->first();
    expect($legacyUser)->not->toBeNull()
        ->and($legacyUser?->role)->toBe(UserRole::Customer)
        ->and($legacyUser?->is_active)->toBeTrue();

    // Authenticate via Sanctum login endpoint
    $this->postJson('/api/v1/auth/login', [
        'email' => 'admin@pickwise.test',
        'password' => 'password',
    ])->assertOk()
        ->assertJsonPath('data.email', 'admin@pickwise.test')
        ->assertJsonPath('data.role', 'admin');

    $this->postJson('/api/v1/auth/logout');

    $this->postJson('/api/v1/auth/login', [
        'email' => 'customer@pickwise.test',
        'password' => 'password',
    ])->assertOk()
        ->assertJsonPath('data.email', 'customer@pickwise.test')
        ->assertJsonPath('data.role', 'customer');
});

test('database seeder seeds demo customer wishlist, comparisons, and assistant threads', function (): void {
    Storage::fake('public');
    $this->seed(DatabaseSeeder::class);

    $customer = User::query()->where('email', 'customer@pickwise.test')->firstOrFail();

    // Wishlist items
    $wishlist = WishlistItem::query()->where('user_id', $customer->id)->with('product')->get();
    expect($wishlist)->toHaveCount(4);

    $wishlistSlugs = $wishlist->pluck('product.slug')->all();
    expect($wishlistSlugs)->toContain(
        'apple-macbook-air-13-m3',
        'sony-wh-1000xm5',
        'dell-ultrasharp-u2723qe',
        'samsung-galaxy-s24',
    );

    // Saved comparisons with share tokens and AI verdicts
    $comparisons = Comparison::query()->where('user_id', $customer->id)->with(['items.product'])->get();
    expect($comparisons)->toHaveCount(2);

    $laptopComp = $comparisons->firstWhere('name', 'Flagship Ultrabooks 2026');
    expect($laptopComp)->not->toBeNull()
        ->and(strlen((string) $laptopComp?->share_token))->toBe(32)
        ->and($laptopComp?->items)->toHaveCount(3)
        ->and($laptopComp?->ai_verdict)->toBeArray()
        ->and($laptopComp?->ai_verdict['verdict'])->toBeString()
        ->and($laptopComp?->ai_verdict['products'])->toHaveCount(3);

    // Shared comparison endpoint works using demo share token
    $this->getJson("/api/v1/shared/comparisons/{$laptopComp?->share_token}")
        ->assertOk()
        ->assertJsonPath('data.name', 'Flagship Ultrabooks 2026')
        ->assertJsonPath('data.ai_verdict.verdict', $laptopComp?->ai_verdict['verdict'])
        ->assertJsonCount(3, 'data.matrix.products');

    // AI conversations & grounded messages
    $conversations = AiConversation::query()->where('user_id', $customer->id)->with('messages')->get();
    expect($conversations)->toHaveCount(2);

    foreach ($conversations as $conversation) {
        expect($conversation->messages)->toHaveCount(2);

        $userMsg = $conversation->messages->firstWhere('role', MessageRole::User);
        $assistantMsg = $conversation->messages->firstWhere('role', MessageRole::Assistant);

        expect($userMsg)->not->toBeNull()
            ->and($userMsg?->content)->toBeString()
            ->and($assistantMsg)->not->toBeNull()
            ->and($assistantMsg?->status)->toBe(AssistantReplyStatus::Ok)
            ->and($assistantMsg?->payload)->toHaveKey('recommendations')
            ->and(count($assistantMsg?->payload['recommendations'] ?? []))->toBeGreaterThanOrEqual(2);
    }
});

test('database seeder populates deterministic AI review summaries for catalog products', function (): void {
    Storage::fake('public');
    $this->seed(DatabaseSeeder::class);

    expect(ReviewSummary::query()->count())->toBe(60);

    $summaries = ReviewSummary::query()->with('product.category')->get();
    expect($summaries->every(static fn (ReviewSummary $s): bool => strlen($s->summary) > 20
        && count($s->pros) >= 2
        && count($s->cons) >= 1
        && in_array($s->sentiment, [ReviewSentiment::Positive, ReviewSentiment::Mixed], true)
        && $s->reviews_count >= 6
        && $s->generated_at !== null))->toBeTrue();

    // Verify product detail endpoint returns seeded review summary
    $sampleProduct = Product::query()->where('slug', 'apple-macbook-air-13-m3')->firstOrFail();
    $response = $this->getJson("/api/v1/products/{$sampleProduct->slug}")
        ->assertOk()
        ->assertJsonPath('data.review_summary.reviews_count', 6)
        ->assertJsonCount(3, 'data.review_summary.pros')
        ->assertJsonCount(2, 'data.review_summary.cons');

    expect(in_array($response->json('data.review_summary.sentiment'), ['positive', 'mixed'], true))->toBeTrue();
});

test('database seeder populates admin AI usage telemetry and activity logs', function (): void {
    Storage::fake('public');
    $this->seed(DatabaseSeeder::class);

    $admin = User::query()->where('email', 'admin@pickwise.test')->firstOrFail();

    // 30 days of AI telemetry
    $logs = AiUsageLog::query()->get();
    expect($logs->count())->toBeGreaterThanOrEqual(90);

    $features = $logs->pluck('feature')->unique()->all();
    expect($features)->toContain(
        AiFeature::Assistant,
        AiFeature::Compare,
        AiFeature::ReviewSummary,
    );

    // Admin activity logs
    $activityLogs = AdminActivityLog::query()->where('admin_id', $admin->id)->get();
    expect($activityLogs)->toHaveCount(6);

    $actions = $activityLogs->pluck('action')->all();
    expect($actions)->toContain(
        'product.updated',
        'category.updated',
        'brand.updated',
        'review.moderated',
        'spec_definition.updated',
        'user.updated',
    );
});

test('demo seeder is idempotent across multiple runs', function (): void {
    Storage::fake('public');
    $this->seed(DatabaseSeeder::class);

    $customer = User::query()->where('email', 'customer@pickwise.test')->firstOrFail();
    $admin = User::query()->where('email', 'admin@pickwise.test')->firstOrFail();

    $firstWishlistCount = WishlistItem::query()->where('user_id', $customer->id)->count();
    $firstComparisonCount = Comparison::query()->where('user_id', $customer->id)->count();
    $firstConversationCount = AiConversation::query()->where('user_id', $customer->id)->count();
    $firstSummaryCount = ReviewSummary::query()->count();
    $firstAiLogCount = AiUsageLog::query()->count();
    $firstActivityCount = AdminActivityLog::query()->count();

    // Re-run DemoSeeder
    $this->seed(DemoSeeder::class);

    expect(User::query()->where('email', 'customer@pickwise.test')->count())->toBe(1)
        ->and(User::query()->where('email', 'admin@pickwise.test')->count())->toBe(1)
        ->and(User::query()->where('email', 'test@example.com')->count())->toBe(1)
        ->and(WishlistItem::query()->where('user_id', $customer->id)->count())->toBe($firstWishlistCount)
        ->and(Comparison::query()->where('user_id', $customer->id)->count())->toBe($firstComparisonCount)
        ->and(AiConversation::query()->where('user_id', $customer->id)->count())->toBe($firstConversationCount)
        ->and(ReviewSummary::query()->count())->toBe($firstSummaryCount)
        ->and(AiUsageLog::query()->count())->toBe($firstAiLogCount)
        ->and(AdminActivityLog::query()->count())->toBe($firstActivityCount);
});
