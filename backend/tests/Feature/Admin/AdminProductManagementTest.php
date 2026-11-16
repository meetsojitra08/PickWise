<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\ProductAvailability;
use App\Enums\SpecDataType;
use App\Enums\UserRole;
use App\Models\AdminActivityLog;
use App\Models\Brand;
use App\Models\Category;
use App\Models\PriceHistory;
use App\Models\Product;
use App\Models\ProductSpec;
use App\Models\SpecDefinition;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('rejects unauthenticated requests to product management', function (): void {
    $this->getJson('/api/v1/admin/products')->assertUnauthorized();
    $this->postJson('/api/v1/admin/products', ['name' => 'Laptop'])->assertUnauthorized();
});

it('rejects non-admin customers from managing products', function (): void {
    $customer = User::factory()->create([
        'role' => UserRole::Customer,
        'is_active' => true,
    ]);

    $this->actingAs($customer)
        ->getJson('/api/v1/admin/products')
        ->assertForbidden();

    $this->actingAs($customer)
        ->postJson('/api/v1/admin/products', ['name' => 'Laptop'])
        ->assertForbidden();
});

it('rejects deactivated admins from managing products', function (): void {
    $inactiveAdmin = User::factory()->admin()->inactive()->create();

    $this->actingAs($inactiveAdmin)
        ->getJson('/api/v1/admin/products')
        ->assertForbidden();
});

it('lists products with search, category, brand, and published filters', function (): void {
    $admin = User::factory()->admin()->create();

    $catAudio = Category::factory()->create(['name' => 'Audio', 'slug' => 'audio']);
    $catComputing = Category::factory()->create(['name' => 'Computing', 'slug' => 'computing']);

    $brandSony = Brand::factory()->create(['name' => 'Sony', 'slug' => 'sony']);
    $brandApple = Brand::factory()->create(['name' => 'Apple', 'slug' => 'apple']);

    $p1 = Product::factory()->create([
        'category_id' => $catAudio->id,
        'brand_id' => $brandSony->id,
        'name' => 'Sony WH-1000XM5',
        'slug' => 'sony-wh-1000xm5',
        'is_published' => true,
        'availability' => ProductAvailability::InStock,
    ]);

    $p2 = Product::factory()->create([
        'category_id' => $catComputing->id,
        'brand_id' => $brandApple->id,
        'name' => 'MacBook Pro 16',
        'slug' => 'macbook-pro-16',
        'is_published' => false,
        'availability' => ProductAvailability::LowStock,
    ]);

    // Unfiltered index
    $response = $this->actingAs($admin)->getJson('/api/v1/admin/products');
    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'category_id',
                    'brand_id',
                    'name',
                    'slug',
                    'summary',
                    'description',
                    'price',
                    'currency',
                    'availability',
                    'availability_label',
                    'value_score',
                    'is_published',
                    'is_deleted',
                    'category',
                    'brand',
                    'created_at',
                    'updated_at',
                ],
            ],
            'links',
            'meta',
        ]);
    expect($response->json('data'))->toHaveCount(2);

    // Search filter
    $searchRes = $this->actingAs($admin)->getJson('/api/v1/admin/products?search=MacBook');
    $searchRes->assertOk();
    expect($searchRes->json('data'))->toHaveCount(1)
        ->and($searchRes->json('data.0.slug'))->toBe('macbook-pro-16');

    // Category filter
    $catRes = $this->actingAs($admin)->getJson("/api/v1/admin/products?category_id={$catAudio->id}");
    $catRes->assertOk();
    expect($catRes->json('data'))->toHaveCount(1)
        ->and($catRes->json('data.0.slug'))->toBe('sony-wh-1000xm5');

    // Published filter
    $pubRes = $this->actingAs($admin)->getJson('/api/v1/admin/products?is_published=false');
    $pubRes->assertOk();
    expect($pubRes->json('data'))->toHaveCount(1)
        ->and($pubRes->json('data.0.slug'))->toBe('macbook-pro-16');
});

it('creates a new product with specs and initial price history, recalculates value score, and logs audit record', function (): void {
    $admin = User::factory()->admin()->create();

    $category = Category::factory()->create(['name' => 'Smartphones', 'slug' => 'smartphones']);
    $brand = Brand::factory()->create(['name' => 'Google', 'slug' => 'google']);

    $specRam = SpecDefinition::factory()->create([
        'category_id' => $category->id,
        'key' => 'ram_gb',
        'label' => 'RAM',
        'data_type' => SpecDataType::Number,
        'is_comparable' => true,
        'higher_is_better' => true,
    ]);

    $specOled = SpecDefinition::factory()->create([
        'category_id' => $category->id,
        'key' => 'is_oled',
        'label' => 'OLED Screen',
        'data_type' => SpecDataType::Boolean,
    ]);

    $payload = [
        'category_id' => $category->id,
        'brand_id' => $brand->id,
        'name' => 'Pixel 9 Pro',
        'summary' => 'Google flagship phone with Gemini AI built-in.',
        'description' => 'The Pixel 9 Pro features a 6.7-inch Super Actua display, Tensor G4 processor, and 16GB RAM.',
        'price' => 109999.00,
        'currency' => 'INR',
        'availability' => ProductAvailability::InStock->value,
        'store_url' => 'https://store.google.com/product/pixel_9_pro',
        'is_published' => true,
        'specs' => [
            ['spec_definition_id' => $specRam->id, 'value' => 16],
            ['spec_definition_id' => $specOled->id, 'value' => true],
        ],
    ];

    $response = $this->actingAs($admin)->postJson('/api/v1/admin/products', $payload);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Pixel 9 Pro')
        ->assertJsonPath('data.slug', 'pixel-9-pro')
        ->assertJsonPath('data.is_published', true)
        ->assertJsonPath('data.price.amount', '109999.00')
        ->assertJsonPath('data.category.id', $category->id)
        ->assertJsonPath('data.brand.id', $brand->id);

    $productId = (int) $response->json('data.id');

    // Product stored in database
    $this->assertDatabaseHas('products', [
        'id' => $productId,
        'slug' => 'pixel-9-pro',
        'price' => '109999.00',
    ]);

    // Initial price history entry recorded
    $history = PriceHistory::query()->where('product_id', $productId)->first();
    expect($history)->not->toBeNull()
        ->and((float) $history->price)->toBe(109999.00)
        ->and($history->recorded_at->toDateString())->toBe(now()->toDateString());

    // Product specs stored with correct typed fields
    $this->assertDatabaseHas('product_specs', [
        'product_id' => $productId,
        'spec_definition_id' => $specRam->id,
        'value_number' => 16,
    ]);

    $this->assertDatabaseHas('product_specs', [
        'product_id' => $productId,
        'spec_definition_id' => $specOled->id,
        'value_bool' => true,
    ]);

    // Value score was calculated for category
    $product = Product::query()->findOrFail($productId);
    expect($product->value_score)->not->toBeNull();

    // Audit log was recorded
    $audit = AdminActivityLog::query()->where('action', 'product.created')->latest('id')->first();
    expect($audit)->not->toBeNull()
        ->and($audit->admin_id)->toBe($admin->id)
        ->and($audit->subject_id)->toBe($productId);
});

it('makes new published product immediately available on public catalog', function (): void {
    $admin = User::factory()->admin()->create();

    $category = Category::factory()->create(['name' => 'Monitors', 'slug' => 'monitors']);
    $brand = Brand::factory()->create(['name' => 'Dell', 'slug' => 'dell']);

    $payload = [
        'category_id' => $category->id,
        'brand_id' => $brand->id,
        'name' => 'Dell UltraSharp 27',
        'slug' => 'dell-ultrasharp-27',
        'summary' => '4K IPS Black monitor with outstanding color accuracy.',
        'description' => 'Dell UltraSharp 27 4K USB-C Hub Monitor offers brilliant contrast and wide color coverage.',
        'price' => 54999.00,
        'currency' => 'INR',
        'is_published' => true,
    ];

    $this->actingAs($admin)->postJson('/api/v1/admin/products', $payload)->assertCreated();

    // Verify public product list includes the new product
    $publicList = $this->getJson('/api/v1/products');
    $publicList->assertOk();
    $found = collect($publicList->json('data'))->firstWhere('slug', 'dell-ultrasharp-27');
    expect($found)->not->toBeNull()
        ->and($found['name'])->toBe('Dell UltraSharp 27');

    // Verify public product detail
    $publicDetail = $this->getJson('/api/v1/products/dell-ultrasharp-27');
    $publicDetail->assertOk()
        ->assertJsonPath('data.name', 'Dell UltraSharp 27')
        ->assertJsonPath('data.slug', 'dell-ultrasharp-27');
});

it('validates product creation inputs including price and spec types', function (): void {
    $admin = User::factory()->admin()->create();

    $category = Category::factory()->create();
    $otherCategory = Category::factory()->create();
    $brand = Brand::factory()->create();

    $numericSpec = SpecDefinition::factory()->create([
        'category_id' => $category->id,
        'label' => 'Weight',
        'data_type' => SpecDataType::Number,
    ]);

    $foreignSpec = SpecDefinition::factory()->create([
        'category_id' => $otherCategory->id,
        'label' => 'Foreign Spec',
        'data_type' => SpecDataType::Text,
    ]);

    // Price must be > 0
    $res1 = $this->actingAs($admin)->postJson('/api/v1/admin/products', [
        'category_id' => $category->id,
        'brand_id' => $brand->id,
        'name' => 'Free Gadget',
        'summary' => 'Test summary',
        'description' => 'Test description',
        'price' => 0,
    ]);
    $res1->assertUnprocessable()->assertJsonValidationErrors(['price'], 'error.details');

    // Spec must belong to the product category and match numeric type
    $res2 = $this->actingAs($admin)->postJson('/api/v1/admin/products', [
        'category_id' => $category->id,
        'brand_id' => $brand->id,
        'name' => 'Invalid Spec Product',
        'summary' => 'Test summary',
        'description' => 'Test description',
        'price' => 1000,
        'specs' => [
            ['spec_definition_id' => $foreignSpec->id, 'value' => 'Hello'],
            ['spec_definition_id' => $numericSpec->id, 'value' => 'not-a-number'],
        ],
    ]);
    $res2->assertUnprocessable()
        ->assertJsonValidationErrors([
            'specs.0.spec_definition_id',
            'specs.1.value',
        ], 'error.details');
});

it('displays product details with specs, images, and price history', function (): void {
    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create();
    $brand = Brand::factory()->create();

    $spec = SpecDefinition::factory()->create([
        'category_id' => $category->id,
        'key' => 'weight_g',
        'label' => 'Weight',
        'data_type' => SpecDataType::Number,
    ]);

    $product = Product::factory()->create([
        'category_id' => $category->id,
        'brand_id' => $brand->id,
        'price' => '25000.00',
    ]);

    ProductSpec::factory()->create([
        'product_id' => $product->id,
        'spec_definition_id' => $spec->id,
        'value_number' => 180,
    ]);

    PriceHistory::factory()->create([
        'product_id' => $product->id,
        'price' => '25000.00',
        'recorded_at' => now()->subMonth(),
    ]);

    $response = $this->actingAs($admin)->getJson("/api/v1/admin/products/{$product->id}");

    $response->assertOk()
        ->assertJsonPath('data.id', $product->id)
        ->assertJsonPath('data.name', $product->name)
        ->assertJsonPath('data.category.id', $category->id)
        ->assertJsonPath('data.brand.id', $brand->id)
        ->assertJsonStructure([
            'data' => [
                'specs' => [
                    '*' => ['id', 'spec_definition_id', 'key', 'label', 'value'],
                ],
                'price_history' => [
                    '*' => ['id', 'recorded_at', 'price'],
                ],
            ],
        ]);
});

it('updates product price, creates new price history entry, recalculates value score, and logs diff', function (): void {
    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create();
    $brand = Brand::factory()->create();

    $spec = SpecDefinition::factory()->create([
        'category_id' => $category->id,
        'key' => 'battery_mah',
        'label' => 'Battery',
        'data_type' => SpecDataType::Number,
        'is_comparable' => true,
        'higher_is_better' => true,
    ]);

    $product = Product::factory()->create([
        'category_id' => $category->id,
        'brand_id' => $brand->id,
        'price' => '30000.00',
        'is_published' => true,
    ]);

    ProductSpec::factory()->create([
        'product_id' => $product->id,
        'spec_definition_id' => $spec->id,
        'value_number' => 5000,
    ]);

    PriceHistory::factory()->create([
        'product_id' => $product->id,
        'price' => '30000.00',
        'recorded_at' => now()->subWeeks(2),
    ]);

    $response = $this->actingAs($admin)->patchJson("/api/v1/admin/products/{$product->id}", [
        'price' => 27999.00,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.price.amount', '27999.00');

    // New price history row was created
    expect(PriceHistory::query()->where('product_id', $product->id)->count())->toBe(2);
    $latestPrice = PriceHistory::query()->where('product_id', $product->id)->latest('id')->first();
    expect((float) $latestPrice?->price)->toBe(27999.00);

    // Audit log records before/after price diff
    $audit = AdminActivityLog::query()->where('action', 'product.updated')->latest('id')->first();
    expect($audit)->not->toBeNull()
        ->and($audit->admin_id)->toBe($admin->id)
        ->and($audit->subject_id)->toBe($product->id)
        ->and((float) ($audit->changes['before']['price'] ?? 0))->toBe(30000.00)
        ->and((float) ($audit->changes['after']['price'] ?? 0))->toBe(27999.00);
});

it('updates product specs and synchronizes specification values', function (): void {
    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create();
    $brand = Brand::factory()->create();

    $spec1 = SpecDefinition::factory()->create([
        'category_id' => $category->id,
        'key' => 'spec_one',
        'data_type' => SpecDataType::Number,
    ]);

    $spec2 = SpecDefinition::factory()->create([
        'category_id' => $category->id,
        'key' => 'spec_two',
        'data_type' => SpecDataType::Text,
    ]);

    $product = Product::factory()->create([
        'category_id' => $category->id,
        'brand_id' => $brand->id,
    ]);

    ProductSpec::factory()->create([
        'product_id' => $product->id,
        'spec_definition_id' => $spec1->id,
        'value_number' => 10,
    ]);

    $response = $this->actingAs($admin)->patchJson("/api/v1/admin/products/{$product->id}", [
        'specs' => [
            ['spec_definition_id' => $spec1->id, 'value' => 20],
            ['spec_definition_id' => $spec2->id, 'value' => 'Titanium'],
        ],
    ]);

    $response->assertOk();

    $this->assertDatabaseHas('product_specs', [
        'product_id' => $product->id,
        'spec_definition_id' => $spec1->id,
        'value_number' => 20,
    ]);

    $this->assertDatabaseHas('product_specs', [
        'product_id' => $product->id,
        'spec_definition_id' => $spec2->id,
        'value_text' => 'Titanium',
    ]);
});

it('soft deletes a product, hides it from public catalog, recalculates value score, and logs audit deletion', function (): void {
    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create();
    $brand = Brand::factory()->create();

    $product = Product::factory()->create([
        'category_id' => $category->id,
        'brand_id' => $brand->id,
        'slug' => 'to-be-deleted',
        'is_published' => true,
    ]);

    $response = $this->actingAs($admin)->deleteJson("/api/v1/admin/products/{$product->id}");

    $response->assertNoContent();

    // Soft deleted in DB (deleted_at is set)
    $this->assertSoftDeleted('products', ['id' => $product->id]);

    // Hidden from public catalog
    $this->getJson('/api/v1/products/to-be-deleted')->assertNotFound();

    // Audit log records deletion
    $audit = AdminActivityLog::query()->where('action', 'product.deleted')->latest('id')->first();
    expect($audit)->not->toBeNull()
        ->and($audit->admin_id)->toBe($admin->id)
        ->and($audit->subject_id)->toBe($product->id);
});

it('bulk updates product published status and records audit log', function (): void {
    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create();
    $brand = Brand::factory()->create();

    $p1 = Product::factory()->create([
        'category_id' => $category->id,
        'brand_id' => $brand->id,
        'is_published' => true,
    ]);

    $p2 = Product::factory()->create([
        'category_id' => $category->id,
        'brand_id' => $brand->id,
        'is_published' => true,
    ]);

    $response = $this->actingAs($admin)->patchJson('/api/v1/admin/products/bulk-status', [
        'product_ids' => [$p1->id, $p2->id],
        'is_published' => false,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.updated_count', 2)
        ->assertJsonPath('data.is_published', false);

    expect($p1->fresh()->is_published)->toBeFalse()
        ->and($p2->fresh()->is_published)->toBeFalse();

    $audit = AdminActivityLog::query()->where('action', 'product.bulk_status_updated')->latest('id')->first();
    expect($audit)->not->toBeNull()
        ->and($audit->admin_id)->toBe($admin->id)
        ->and($audit->changes['is_published'] ?? null)->toBeFalse();
});
