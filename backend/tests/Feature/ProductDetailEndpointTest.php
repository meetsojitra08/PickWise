<?php

declare(strict_types=1);

use App\Enums\ProductAvailability;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductSpec;
use App\Models\SpecDefinition;
use Database\Seeders\CatalogSeeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('product detail endpoint returns full resource payload with ordered gallery and specs', function (): void {
    $computers = Category::factory()->create([
        'name' => 'Computers',
        'slug' => 'computers',
    ]);
    $laptops = Category::factory()->childOf($computers)->create([
        'name' => 'Laptops',
        'slug' => 'laptops',
    ]);
    $brand = Brand::factory()->withLogo('brands/lenovo.svg')->create([
        'name' => 'Lenovo',
        'slug' => 'lenovo',
    ]);

    $this->travelTo(now()->setDate(2026, 11, 10)->setTime(14, 15, 0));

    $product = Product::factory()
        ->for($laptops)
        ->for($brand)
        ->withRating(4.70, 38)
        ->withValueScore(92)
        ->create([
            'name' => 'Lenovo Yoga Slim 7 Pro 14',
            'slug' => 'lenovo-yoga-slim-7-pro-14',
            'summary' => '32GB RAM, 1TB SSD, and factory-calibrated OLED display.',
            'description' => 'Balanced creator ultrabook with quiet fans and sharp 2.8K OLED panel.',
            'price' => '84999.00',
            'currency' => 'INR',
            'availability' => ProductAvailability::InStock->value,
            'store_url' => 'https://store.example.com/products/lenovo-yoga-slim-7-pro-14',
        ]);

    // Create secondary images first with lower sort_order to verify primary image still leads the gallery.
    $secondGallery = ProductImage::factory()->for($product)->create([
        'path' => 'products/lenovo-yoga-slim-7-pro-14/ports.svg',
        'alt_text' => 'Lenovo Yoga Slim 7 Pro 14 side ports',
        'sort_order' => 2,
        'is_primary' => false,
    ]);
    $firstGallery = ProductImage::factory()->for($product)->create([
        'path' => 'products/lenovo-yoga-slim-7-pro-14/overview.svg',
        'alt_text' => 'Lenovo Yoga Slim 7 Pro 14 keyboard deck',
        'sort_order' => 1,
        'is_primary' => false,
    ]);
    $primaryImage = ProductImage::factory()->for($product)->primary()->create([
        'path' => 'products/lenovo-yoga-slim-7-pro-14/front.svg',
        'alt_text' => 'Lenovo Yoga Slim 7 Pro 14 front view',
        'sort_order' => 5,
    ]);

    // Insert specs out of order so sorting by spec_definitions.sort_order is verified.
    $panelSpec = SpecDefinition::factory()->for($laptops)->text()->filterable()->comparable()->create([
        'key' => 'display_panel',
        'label' => 'Display Panel',
        'sort_order' => 4,
    ]);
    $ramSpec = SpecDefinition::factory()->for($laptops)->numeric('GB', true)->filterable()->comparable()->create([
        'key' => 'ram_gb',
        'label' => 'RAM',
        'sort_order' => 1,
    ]);
    $gpuSpec = SpecDefinition::factory()->for($laptops)->boolean(true)->filterable()->comparable()->create([
        'key' => 'dedicated_gpu',
        'label' => 'Dedicated GPU',
        'sort_order' => 3,
    ]);
    $weightSpec = SpecDefinition::factory()->for($laptops)->numeric('kg', false)->filterable()->comparable()->create([
        'key' => 'weight_kg',
        'label' => 'Weight',
        'sort_order' => 2,
    ]);

    ProductSpec::factory()->for($product)->for($panelSpec)->textValue('OLED')->create();
    ProductSpec::factory()->for($product)->for($ramSpec)->numericValue(32)->create();
    ProductSpec::factory()->for($product)->for($gpuSpec)->booleanValue(false)->create();
    ProductSpec::factory()->for($product)->for($weightSpec)->numericValue(1.45)->create();

    $response = $this->withHeader('X-Request-Id', 'req-product-show-1')
        ->getJson('/api/v1/products/lenovo-yoga-slim-7-pro-14');

    $response->assertOk()
        ->assertHeader('X-Request-Id', 'req-product-show-1')
        ->assertHeader('X-RateLimit-Limit', '120')
        ->assertExactJson([
            'data' => [
                'id' => $product->id,
                'name' => 'Lenovo Yoga Slim 7 Pro 14',
                'slug' => 'lenovo-yoga-slim-7-pro-14',
                'summary' => '32GB RAM, 1TB SSD, and factory-calibrated OLED display.',
                'description' => 'Balanced creator ultrabook with quiet fans and sharp 2.8K OLED panel.',
                'price' => [
                    'amount' => '84999.00',
                    'currency' => 'INR',
                ],
                'availability' => 'in_stock',
                'availability_label' => 'In Stock',
                'store_url' => 'https://store.example.com/products/lenovo-yoga-slim-7-pro-14',
                'rating_avg' => 4.7,
                'rating_count' => 38,
                'value_score' => 92,
                'category' => [
                    'id' => $laptops->id,
                    'name' => 'Laptops',
                    'slug' => 'laptops',
                ],
                'brand' => [
                    'id' => $brand->id,
                    'name' => 'Lenovo',
                    'slug' => 'lenovo',
                    'logo_url' => '/storage/brands/lenovo.svg',
                ],
                'primary_image' => [
                    'id' => $primaryImage->id,
                    'url' => '/storage/products/lenovo-yoga-slim-7-pro-14/front.svg',
                    'alt_text' => 'Lenovo Yoga Slim 7 Pro 14 front view',
                    'sort_order' => 5,
                    'is_primary' => true,
                ],
                'images' => [
                    [
                        'id' => $primaryImage->id,
                        'url' => '/storage/products/lenovo-yoga-slim-7-pro-14/front.svg',
                        'alt_text' => 'Lenovo Yoga Slim 7 Pro 14 front view',
                        'sort_order' => 5,
                        'is_primary' => true,
                    ],
                    [
                        'id' => $firstGallery->id,
                        'url' => '/storage/products/lenovo-yoga-slim-7-pro-14/overview.svg',
                        'alt_text' => 'Lenovo Yoga Slim 7 Pro 14 keyboard deck',
                        'sort_order' => 1,
                        'is_primary' => false,
                    ],
                    [
                        'id' => $secondGallery->id,
                        'url' => '/storage/products/lenovo-yoga-slim-7-pro-14/ports.svg',
                        'alt_text' => 'Lenovo Yoga Slim 7 Pro 14 side ports',
                        'sort_order' => 2,
                        'is_primary' => false,
                    ],
                ],
                'specs' => [
                    [
                        'key' => 'ram_gb',
                        'label' => 'RAM',
                        'unit' => 'GB',
                        'data_type' => 'number',
                        'value' => 32,
                        'is_comparable' => true,
                        'higher_is_better' => true,
                    ],
                    [
                        'key' => 'weight_kg',
                        'label' => 'Weight',
                        'unit' => 'kg',
                        'data_type' => 'number',
                        'value' => 1.45,
                        'is_comparable' => true,
                        'higher_is_better' => false,
                    ],
                    [
                        'key' => 'dedicated_gpu',
                        'label' => 'Dedicated GPU',
                        'unit' => null,
                        'data_type' => 'boolean',
                        'value' => false,
                        'is_comparable' => true,
                        'higher_is_better' => true,
                    ],
                    [
                        'key' => 'display_panel',
                        'label' => 'Display Panel',
                        'unit' => null,
                        'data_type' => 'text',
                        'value' => 'OLED',
                        'is_comparable' => true,
                        'higher_is_better' => null,
                    ],
                ],
                'created_at' => '2026-11-10T14:15:00Z',
                'updated_at' => '2026-11-10T14:15:00Z',
            ],
        ]);
});

test('product detail endpoint handles missing images, missing specs, and nullable metadata gracefully', function (): void {
    $category = Category::factory()->create(['slug' => 'accessories']);
    $brand = Brand::factory()->create(['slug' => 'belkin', 'logo_path' => null]);

    $minimal = Product::factory()->for($category)->for($brand)->lowStock()->create([
        'name' => 'Belkin USB-C Dock',
        'slug' => 'belkin-usb-c-dock',
        'store_url' => null,
        'value_score' => null,
        'rating_avg' => '0.00',
        'rating_count' => 0,
    ]);

    $this->getJson('/api/v1/products/belkin-usb-c-dock')
        ->assertOk()
        ->assertJsonPath('data.id', $minimal->id)
        ->assertJsonPath('data.availability', 'low_stock')
        ->assertJsonPath('data.availability_label', 'Low Stock')
        ->assertJsonPath('data.store_url', null)
        ->assertJsonPath('data.value_score', null)
        ->assertJsonPath('data.rating_avg', 0)
        ->assertJsonPath('data.rating_count', 0)
        ->assertJsonPath('data.brand.logo_url', null)
        ->assertJsonPath('data.primary_image', null)
        ->assertJsonPath('data.images', [])
        ->assertJsonPath('data.specs', []);

    // Product with gallery images where none is flagged is_primary keeps primary_image null.
    $noPrimary = Product::factory()->for($category)->for($brand)->create([
        'slug' => 'usb-c-cable',
    ]);
    $imgB = ProductImage::factory()->for($noPrimary)->create(['sort_order' => 2, 'is_primary' => false]);
    $imgA = ProductImage::factory()->for($noPrimary)->create(['sort_order' => 1, 'is_primary' => false]);

    $noPrimaryResp = $this->getJson('/api/v1/products/usb-c-cable')->assertOk();
    expect($noPrimaryResp->json('data.primary_image'))->toBeNull()
        ->and(array_column($noPrimaryResp->json('data.images'), 'id'))->toBe([$imgA->id, $imgB->id]);
});

test('product detail endpoint returns 404 envelope for unknown, unpublished, soft-deleted, and inactive-category products', function (): void {
    $activeCategory = Category::factory()->create(['slug' => 'laptops']);
    $inactiveCategory = Category::factory()->inactive()->create(['slug' => 'archived']);
    $orphanedCategory = Category::factory()->childOf($inactiveCategory)->create(['slug' => 'orphaned']);
    $brand = Brand::factory()->create();

    Product::factory()->unpublished()->for($activeCategory)->for($brand)->create(['slug' => 'unpublished-laptop']);
    Product::factory()->trashed()->for($activeCategory)->for($brand)->create(['slug' => 'deleted-laptop']);
    Product::factory()->for($inactiveCategory)->for($brand)->create(['slug' => 'inactive-category-laptop']);
    Product::factory()->for($orphanedCategory)->for($brand)->create(['slug' => 'orphaned-category-laptop']);

    $hiddenSlugs = [
        'unknown-slug',
        'unpublished-laptop',
        'deleted-laptop',
        'inactive-category-laptop',
        'orphaned-category-laptop',
    ];

    foreach ($hiddenSlugs as $slug) {
        $this->withHeader('X-Request-Id', "req-404-{$slug}")
            ->getJson("/api/v1/products/{$slug}")
            ->assertNotFound()
            ->assertHeader('X-Request-Id', "req-404-{$slug}")
            ->assertExactJson([
                'error' => [
                    'code' => 'not_found',
                    'message' => 'Resource not found.',
                    'request_id' => "req-404-{$slug}",
                ],
            ]);
    }
});

test('product detail endpoint executes with zero lazy loading and constant query count', function (): void {
    $category = Category::factory()->create(['slug' => 'monitors']);
    $brand = Brand::factory()->create(['slug' => 'dell']);

    $product = Product::factory()->for($category)->for($brand)->create([
        'slug' => 'dell-ultrasharp-27',
    ]);
    ProductImage::factory()->for($product)->primary()->create();
    ProductImage::factory()->count(3)->for($product)->create();

    $specs = SpecDefinition::factory()->count(8)->for($category)->numeric('Hz', true)->create();
    foreach ($specs as $index => $specDef) {
        ProductSpec::factory()->for($product)->for($specDef)->numericValue(60 + $index * 15)->create();
    }

    $wasPreventingLazyLoading = Model::preventsLazyLoading();
    Model::preventLazyLoading(true);
    DB::flushQueryLog();
    DB::enableQueryLog();

    try {
        $this->getJson('/api/v1/products/dell-ultrasharp-27')
            ->assertOk()
            ->assertJsonCount(4, 'data.images')
            ->assertJsonCount(8, 'data.specs');

        expect(count(DB::getQueryLog()))->toBeLessThanOrEqual(8);
    } finally {
        DB::disableQueryLog();
        Model::preventLazyLoading($wasPreventingLazyLoading);
    }
});

test('product detail endpoint returns seeded showcase product with gallery and ordered specs', function (): void {
    Storage::fake('public');
    $this->seed(CatalogSeeder::class);

    $response = $this->getJson('/api/v1/products/apple-macbook-air-13-m3');

    $response->assertOk()
        ->assertJsonPath('data.slug', 'apple-macbook-air-13-m3')
        ->assertJsonPath('data.brand.slug', 'apple')
        ->assertJsonPath('data.category.slug', 'laptops')
        ->assertJsonPath('data.price.amount', '89900.00')
        ->assertJsonPath('data.price.currency', 'INR')
        ->assertJsonPath('data.store_url', 'https://store.example.com/products/apple-macbook-air-13-m3')
        ->assertJsonPath('data.primary_image.is_primary', true)
        ->assertJsonCount(2, 'data.images')
        ->assertJsonCount(9, 'data.specs');

    $specKeys = array_column($response->json('data.specs'), 'key');
    expect($specKeys)->toBe([
        'ram_gb',
        'storage_gb',
        'display_size_in',
        'battery_hours',
        'weight_kg',
        'refresh_rate_hz',
        'dedicated_gpu',
        'processor',
        'display_panel',
    ]);
});
