<?php

declare(strict_types=1);

use App\Enums\AiFailureReason;
use App\Enums\AiFeature;
use App\Enums\AiUsageStatus;
use App\Models\AiUsageLog;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Comparison;
use App\Models\ComparisonItem;
use App\Models\Product;
use App\Models\ProductSpec;
use App\Models\SpecDefinition;
use App\Models\User;
use App\Services\AiQuotaService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    config()->set('ai.groq.model', 'test-compare-model');
});

/**
 * @return array{Category, Brand, list<Product>}
 */
function createComparableProducts(int $count = 2): array
{
    $category = Category::factory()->create(['name' => 'Laptops', 'slug' => 'laptops']);
    $brand = Brand::factory()->create(['name' => 'Lenovo', 'slug' => 'lenovo']);

    $ramDef = SpecDefinition::factory()->for($category)->numeric('GB', true)->comparable()->create([
        'key' => 'ram_gb',
        'label' => 'RAM',
        'sort_order' => 1,
    ]);

    $products = [];
    for ($i = 1; $i <= $count; $i++) {
        $product = Product::factory()->for($category)->for($brand)->create([
            'name' => "Laptop Model {$i}",
            'slug' => "laptop-model-{$i}",
            'price' => (string) (60000 + ($i * 10000)),
            'summary' => "High performance laptop number {$i}",
        ]);

        ProductSpec::factory()->for($product)->for($ramDef, 'specDefinition')->numericValue(8 * $i)->create();
        $products[] = $product;
    }

    return [$category, $brand, $products];
}

test('compare verdict endpoint generates strengths, weaknesses, verdict and reduces daily quota', function (): void {
    [, , $products] = createComparableProducts(2);
    [$p1, $p2] = $products;

    fakeGroqClient()->willReturn([
        'verdict' => 'Laptop Model 1 is best for tighter budgets, while Laptop Model 2 provides double the RAM for heavier workloads.',
        'products' => [
            [
                'product_id' => $p1->id,
                'strengths' => ['Affordable price point', 'Lightweight design'],
                'weaknesses' => ['Only 8GB RAM for multitasking'],
            ],
            [
                'product_id' => $p2->id,
                'strengths' => ['16GB RAM for intense workflows', 'Superior performance'],
                'weaknesses' => ['Higher price tag'],
            ],
        ],
    ]);

    $response = $this->postJson('/api/v1/compare/verdict', [
        'product_ids' => [$p1->id, $p2->id],
    ]);

    $response->assertOk()
        ->assertJsonPath('data.verdict', 'Laptop Model 1 is best for tighter budgets, while Laptop Model 2 provides double the RAM for heavier workloads.')
        ->assertJsonCount(2, 'data.products')
        ->assertJsonPath('data.products.0.product_id', $p1->id)
        ->assertJsonPath('data.products.0.name', 'Laptop Model 1')
        ->assertJsonPath('data.products.0.strengths.0', 'Affordable price point')
        ->assertJsonPath('data.products.0.weaknesses.0', 'Only 8GB RAM for multitasking')
        ->assertJsonPath('data.products.1.product_id', $p2->id)
        ->assertJsonPath('data.products.1.name', 'Laptop Model 2')
        ->assertJsonPath('data.products.1.strengths.0', '16GB RAM for intense workflows')
        ->assertJsonPath('data.quota.used', 1)
        ->assertJsonPath('data.quota.remaining', 4); // Guest limit is 5 by default

    // Assert AI usage log was saved
    $log = AiUsageLog::query()->latest('id')->first();
    expect($log)->not->toBeNull()
        ->and($log->feature)->toBe(AiFeature::Compare)
        ->and($log->status)->toBe(AiUsageStatus::Ok)
        ->and($log->model)->toBe('test-compare-model');
});

test('compare verdict validates two to four distinct available products in the same active category', function (): void {
    $category = Category::factory()->create(['name' => 'Laptops', 'slug' => 'laptops']);
    $otherCategory = Category::factory()->create(['name' => 'Audio', 'slug' => 'audio']);
    $brand = Brand::factory()->create();

    $p1 = Product::factory()->for($category)->for($brand)->create();
    $p2 = Product::factory()->for($category)->for($brand)->create();
    $p3 = Product::factory()->for($category)->for($brand)->create();
    $p4 = Product::factory()->for($category)->for($brand)->create();
    $p5 = Product::factory()->for($category)->for($brand)->create();
    $diffCategoryProduct = Product::factory()->for($otherCategory)->for($brand)->create();
    $unpublished = Product::factory()->for($category)->for($brand)->create(['is_published' => false]);

    // Fewer than 2
    $this->postJson('/api/v1/compare/verdict', ['product_ids' => [$p1->id]])
        ->assertUnprocessable()
        ->assertJsonPath('error.details.product_ids.0', 'Choose at least two products to compare.');

    // More than 4
    $this->postJson('/api/v1/compare/verdict', ['product_ids' => [$p1->id, $p2->id, $p3->id, $p4->id, $p5->id]])
        ->assertUnprocessable()
        ->assertJsonPath('error.details.product_ids.0', 'You can compare up to four products at a time.');

    // Duplicates
    $this->postJson('/api/v1/compare/verdict', ['product_ids' => [$p1->id, $p1->id]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('product_ids.1', 'error.details');

    // Different categories
    $this->postJson('/api/v1/compare/verdict', ['product_ids' => [$p1->id, $diffCategoryProduct->id]])
        ->assertUnprocessable()
        ->assertJsonPath('error.details.product_ids.0', 'Products from different categories cannot be compared.');

    // Unpublished product
    $this->postJson('/api/v1/compare/verdict', ['product_ids' => [$p1->id, $unpublished->id]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('product_ids.1', 'error.details');
});

test('priority field is forwarded to the prompt and reflected in groq call', function (): void {
    [, , $products] = createComparableProducts(2);
    [$p1, $p2] = $products;

    $fake = fakeGroqClient()->willReturn([
        'verdict' => 'Given the battery priority, Laptop Model 2 is superior due to efficiency.',
        'products' => [
            [
                'product_id' => $p1->id,
                'strengths' => ['Decent endurance'],
                'weaknesses' => ['Smaller battery'],
            ],
            [
                'product_id' => $p2->id,
                'strengths' => ['Outstanding 18h battery life'],
                'weaknesses' => ['Heavier adapter'],
            ],
        ],
    ]);

    $this->postJson('/api/v1/compare/verdict', [
        'product_ids' => [$p1->id, $p2->id],
        'priority' => 'battery life and portability',
    ])->assertOk();

    expect($fake->lastUserPrompt())->toContain('battery life and portability');
});

test('rejects product ids in the reply that were not sent', function (): void {
    [, , $products] = createComparableProducts(2);
    [$p1, $p2] = $products;

    fakeGroqClient()->willReturn([
        'verdict' => 'Balanced options.',
        'products' => [
            [
                'product_id' => $p1->id,
                'strengths' => ['Great value'],
                'weaknesses' => ['Plastic build'],
            ],
            [
                'product_id' => 99999, // Unsent / invented product ID
                'strengths' => ['Invented feature'],
                'weaknesses' => ['Invented con'],
            ],
            [
                'product_id' => $p2->id,
                'strengths' => ['Fast processor'],
                'weaknesses' => ['Dim screen'],
            ],
        ],
    ]);

    $response = $this->postJson('/api/v1/compare/verdict', [
        'product_ids' => [$p1->id, $p2->id],
    ]);

    $response->assertOk()
        ->assertJsonCount(2, 'data.products')
        ->assertJsonPath('data.products.0.product_id', $p1->id)
        ->assertJsonPath('data.products.1.product_id', $p2->id);
});

test('returns 503 when groq returns only unknown products', function (): void {
    [, , $products] = createComparableProducts(2);
    [$p1, $p2] = $products;

    fakeGroqClient()->willReturn([
        'verdict' => 'All wrong products.',
        'products' => [
            [
                'product_id' => 99999,
                'strengths' => ['Invented'],
                'weaknesses' => ['Invented'],
            ],
        ],
    ]);

    $this->postJson('/api/v1/compare/verdict', [
        'product_ids' => [$p1->id, $p2->id],
    ])->assertStatus(503)
        ->assertJsonPath('error.code', 'ai_unavailable');
});

test('provider failure or invalid json returns 503 ai_unavailable and does not consume quota', function (): void {
    [, , $products] = createComparableProducts(2);
    [$p1, $p2] = $products;

    fakeGroqClient()->willFail(AiFailureReason::Connection);

    $this->postJson('/api/v1/compare/verdict', [
        'product_ids' => [$p1->id, $p2->id],
    ])->assertStatus(503)
        ->assertJsonPath('error.code', 'ai_unavailable');

    // Quota should still be 0 used
    $quota = app(AiQuotaService::class)->snapshot(request());
    expect($quota->used)->toBe(0);

    // Usage log should be recorded as error
    $log = AiUsageLog::query()->latest('id')->first();
    expect($log)->not->toBeNull()
        ->and($log->feature)->toBe(AiFeature::Compare)
        ->and($log->status)->toBe(AiUsageStatus::Error)
        ->and($log->error_code)->toBe(AiFailureReason::Connection->value);
});

test('daily quota limit blocks further verdict generation with 429 ai_quota_exceeded', function (): void {
    config()->set('ai.daily_quota.guest', 1);

    [, , $products] = createComparableProducts(2);
    [$p1, $p2] = $products;

    fakeGroqClient()->willReturn([
        'verdict' => 'First verdict.',
        'products' => [
            ['product_id' => $p1->id, 'strengths' => ['S1'], 'weaknesses' => ['W1']],
            ['product_id' => $p2->id, 'strengths' => ['S2'], 'weaknesses' => ['W2']],
        ],
    ]);

    // First call consumes the 1 quota
    $this->postJson('/api/v1/compare/verdict', [
        'product_ids' => [$p1->id, $p2->id],
    ])->assertOk()
        ->assertJsonPath('data.quota.remaining', 0);

    // Second call is rejected by middleware
    $this->postJson('/api/v1/compare/verdict', [
        'product_ids' => [$p1->id, $p2->id],
    ])->assertStatus(429)
        ->assertJsonPath('error.code', 'ai_quota_exceeded');

    $log = AiUsageLog::query()->latest('id')->first();
    expect($log)->not->toBeNull()
        ->and($log->feature)->toBe(AiFeature::Compare)
        ->and($log->status)->toBe(AiUsageStatus::RateLimited);
});

test('stores ai_verdict on a saved comparison when comparison_id is passed', function (): void {
    $customer = User::factory()->create();
    [, , $products] = createComparableProducts(2);
    [$p1, $p2] = $products;

    $comparison = Comparison::factory()->for($customer)->create(['name' => 'My saved comparison']);
    ComparisonItem::factory()->for($comparison)->for($p1)->create(['position' => 1]);
    ComparisonItem::factory()->for($comparison)->for($p2)->create(['position' => 2]);

    fakeGroqClient()->willReturn([
        'verdict' => 'Model 1 is cheaper; Model 2 is faster.',
        'products' => [
            ['product_id' => $p1->id, 'strengths' => ['Low price'], 'weaknesses' => ['Basic display']],
            ['product_id' => $p2->id, 'strengths' => ['Bright OLED'], 'weaknesses' => ['Expensive']],
        ],
    ]);

    $this->actingAs($customer)
        ->postJson('/api/v1/compare/verdict', [
            'product_ids' => [$p1->id, $p2->id],
            'comparison_id' => $comparison->id,
        ])
        ->assertOk()
        ->assertJsonPath('data.comparison_id', $comparison->id);

    $comparison->refresh();
    expect($comparison->ai_verdict)->not->toBeNull()
        ->and($comparison->ai_verdict['verdict'])->toBe('Model 1 is cheaper; Model 2 is faster.')
        ->and($comparison->ai_verdict['products'])->toHaveCount(2);

    // GET /api/v1/comparisons/{id} should return ai_verdict
    $this->actingAs($customer)
        ->getJson('/api/v1/comparisons/'.$comparison->id)
        ->assertOk()
        ->assertJsonPath('data.ai_verdict.verdict', 'Model 1 is cheaper; Model 2 is faster.')
        ->assertJsonCount(2, 'data.ai_verdict.products');
});

test('cannot attach verdict to another customers comparison', function (): void {
    $owner = User::factory()->create();
    $otherCustomer = User::factory()->create();
    [, , $products] = createComparableProducts(2);
    [$p1, $p2] = $products;

    $comparison = Comparison::factory()->for($owner)->create(['name' => 'Owner comparison']);

    $this->actingAs($otherCustomer)
        ->postJson('/api/v1/compare/verdict', [
            'product_ids' => [$p1->id, $p2->id],
            'comparison_id' => $comparison->id,
        ])
        ->assertUnprocessable()
        ->assertJsonPath('error.details.comparison_id.0', 'You cannot attach a verdict to another user\'s comparison.');
});

test('saving comparison can include ai_verdict and updating products resets it', function (): void {
    $customer = User::factory()->create();
    [, , $products] = createComparableProducts(3);
    [$p1, $p2, $p3] = $products;

    $verdictPayload = [
        'verdict' => 'Preset comparison verdict.',
        'products' => [
            ['product_id' => $p1->id, 'strengths' => ['Strong'], 'weaknesses' => ['Weak']],
            ['product_id' => $p2->id, 'strengths' => ['Stronger'], 'weaknesses' => ['Weaker']],
        ],
    ];

    $response = $this->actingAs($customer)->postJson('/api/v1/comparisons', [
        'name' => 'Comparison with verdict',
        'product_ids' => [$p1->id, $p2->id],
        'ai_verdict' => $verdictPayload,
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.ai_verdict.verdict', 'Preset comparison verdict.');

    $comparisonId = (int) $response->json('data.id');

    // Updating products resets ai_verdict
    $this->actingAs($customer)->patchJson("/api/v1/comparisons/{$comparisonId}", [
        'product_ids' => [$p2->id, $p3->id],
    ])->assertOk()
        ->assertJsonPath('data.ai_verdict', null);
});
