<?php

declare(strict_types=1);

use App\Enums\ProductAvailability;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductSpec;
use App\Models\SpecDefinition;
use Database\Seeders\CatalogSeeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('categories endpoint returns empty list when no active categories exist', function (): void {
    Category::factory()->inactive()->create(['slug' => 'hidden-category']);

    $this->getJson('/api/v1/categories')
        ->assertOk()
        ->assertHeader('X-Request-Id')
        ->assertExactJson([
            'data' => [],
        ]);
});

test('categories endpoint returns ordered active tree with nested children and published product counts', function (): void {
    $audio = Category::factory()->create([
        'name' => 'Audio',
        'slug' => 'audio',
        'image_path' => 'categories/audio.svg',
        'sort_order' => 2,
    ]);

    $computers = Category::factory()->create([
        'name' => 'Computers',
        'slug' => 'computers',
        'description' => 'Workstations and portable computers.',
        'image_path' => 'categories/computers.svg',
        'sort_order' => 1,
    ]);

    $inactiveRoot = Category::factory()->inactive()->create([
        'name' => 'Archived',
        'slug' => 'archived',
        'sort_order' => 0,
    ]);

    $desktops = Category::factory()->childOf($computers)->create([
        'name' => 'Desktops',
        'slug' => 'desktops',
        'image_path' => null,
        'sort_order' => 2,
    ]);

    $laptops = Category::factory()->childOf($computers)->create([
        'name' => 'Laptops',
        'slug' => 'laptops',
        'image_path' => 'categories/laptops.svg',
        'sort_order' => 1,
    ]);

    // Inactive child and active child under an inactive parent must both stay hidden.
    $inactiveChild = Category::factory()->inactive()->childOf($computers)->create([
        'name' => 'Tablets',
        'slug' => 'tablets',
        'sort_order' => 0,
    ]);

    $orphanedChild = Category::factory()->childOf($inactiveRoot)->create([
        'name' => 'Orphaned',
        'slug' => 'orphaned',
        'sort_order' => 1,
    ]);

    $brand = Brand::factory()->create();

    // 2 published in laptops, 1 published in desktops, 1 direct in computers = 4 total under computers.
    Product::factory()->count(2)->for($laptops)->for($brand)->create();
    Product::factory()->for($desktops)->for($brand)->create();
    Product::factory()->for($computers)->for($brand)->create();

    // Unpublished and soft-deleted products must not increment counts.
    Product::factory()->unpublished()->for($laptops)->for($brand)->create();
    Product::factory()->trashed()->for($desktops)->for($brand)->create();
    Product::factory()->for($inactiveChild)->for($brand)->create();
    Product::factory()->for($orphanedChild)->for($brand)->create();
    Product::factory()->for($audio)->for($brand)->create();

    $response = $this->getJson('/api/v1/categories');

    $response->assertOk()
        ->assertHeader('X-Request-Id')
        ->assertHeader('X-RateLimit-Limit', '120')
        ->assertExactJson([
            'data' => [
                [
                    'id' => $computers->id,
                    'parent_id' => null,
                    'name' => 'Computers',
                    'slug' => 'computers',
                    'description' => 'Workstations and portable computers.',
                    'image_url' => '/storage/categories/computers.svg',
                    'sort_order' => 1,
                    'products_count' => 4,
                    'children' => [
                        [
                            'id' => $laptops->id,
                            'parent_id' => $computers->id,
                            'name' => 'Laptops',
                            'slug' => 'laptops',
                            'description' => $laptops->description,
                            'image_url' => '/storage/categories/laptops.svg',
                            'sort_order' => 1,
                            'products_count' => 2,
                            'children' => [],
                        ],
                        [
                            'id' => $desktops->id,
                            'parent_id' => $computers->id,
                            'name' => 'Desktops',
                            'slug' => 'desktops',
                            'description' => $desktops->description,
                            'image_url' => null,
                            'sort_order' => 2,
                            'products_count' => 1,
                            'children' => [],
                        ],
                    ],
                ],
                [
                    'id' => $audio->id,
                    'parent_id' => null,
                    'name' => 'Audio',
                    'slug' => 'audio',
                    'description' => $audio->description,
                    'image_url' => '/storage/categories/audio.svg',
                    'sort_order' => 2,
                    'products_count' => 1,
                    'children' => [],
                ],
            ],
        ]);
});

test('categories endpoint loads tree with zero lazy loading and constant query count', function (): void {
    $brand = Brand::factory()->create();

    foreach (range(1, 5) as $index) {
        $parent = Category::factory()->create(['sort_order' => $index]);
        $child = Category::factory()->childOf($parent)->create(['sort_order' => 1]);
        Product::factory()->count(2)->for($child)->for($brand)->create();
    }

    $wasPreventingLazyLoading = Model::preventsLazyLoading();
    Model::preventLazyLoading(true);
    DB::flushQueryLog();
    DB::enableQueryLog();

    try {
        $this->getJson('/api/v1/categories')
            ->assertOk()
            ->assertJsonCount(5, 'data');

        expect(count(DB::getQueryLog()))->toBeLessThanOrEqual(2);
    } finally {
        DB::disableQueryLog();
        Model::preventLazyLoading($wasPreventingLazyLoading);
    }
});

test('category filters endpoint returns dynamic price range, brands, availability, and filterable specs', function (): void {
    $laptops = Category::factory()->create([
        'name' => 'Laptops',
        'slug' => 'laptops',
        'image_path' => 'categories/laptops.svg',
        'sort_order' => 1,
    ]);
    $otherCategory = Category::factory()->create(['slug' => 'monitors']);

    $brandLenovo = Brand::factory()->withLogo()->create(['name' => 'Lenovo', 'slug' => 'lenovo']);
    $brandApple = Brand::factory()->withLogo()->create(['name' => 'Apple', 'slug' => 'apple']);
    $brandUnpublishedOnly = Brand::factory()->create(['name' => 'Acer', 'slug' => 'acer']);
    $brandOtherCategory = Brand::factory()->create(['name' => 'Dell', 'slug' => 'dell']);

    $ramSpec = SpecDefinition::factory()->for($laptops)->numeric('GB', true)->filterable()->create([
        'key' => 'ram_gb',
        'label' => 'RAM',
        'sort_order' => 1,
    ]);
    $weightSpec = SpecDefinition::factory()->for($laptops)->numeric('kg', false)->filterable()->create([
        'key' => 'weight_kg',
        'label' => 'Weight',
        'sort_order' => 2,
    ]);
    $gpuSpec = SpecDefinition::factory()->for($laptops)->boolean(true)->filterable()->create([
        'key' => 'dedicated_gpu',
        'label' => 'Dedicated GPU',
        'sort_order' => 3,
    ]);
    $panelSpec = SpecDefinition::factory()->for($laptops)->text()->filterable()->create([
        'key' => 'display_panel',
        'label' => 'Display Panel',
        'sort_order' => 4,
    ]);

    // Non-filterable specs must not appear in filter facets.
    $cpuSpec = SpecDefinition::factory()->for($laptops)->text()->create([
        'key' => 'processor',
        'label' => 'Processor',
        'is_filterable' => false,
        'sort_order' => 5,
    ]);
    $refreshSpec = SpecDefinition::factory()->for($laptops)->numeric('Hz', true)->create([
        'key' => 'refresh_rate_hz',
        'label' => 'Refresh Rate',
        'is_filterable' => false,
        'sort_order' => 6,
    ]);

    $p1 = Product::factory()->for($laptops)->for($brandLenovo)->create([
        'price' => '42999.00',
        'availability' => ProductAvailability::InStock->value,
    ]);
    ProductSpec::factory()->for($p1)->for($ramSpec)->numericValue(16)->create();
    ProductSpec::factory()->for($p1)->for($weightSpec)->numericValue(1.62)->create();
    ProductSpec::factory()->for($p1)->for($gpuSpec)->booleanValue(false)->create();
    ProductSpec::factory()->for($p1)->for($panelSpec)->textValue('IPS')->create();
    ProductSpec::factory()->for($p1)->for($cpuSpec)->textValue('Ryzen 5')->create();
    ProductSpec::factory()->for($p1)->for($refreshSpec)->numericValue(60)->create();

    $p2 = Product::factory()->for($laptops)->for($brandLenovo)->lowStock()->create([
        'price' => '84999.50',
    ]);
    ProductSpec::factory()->for($p2)->for($ramSpec)->numericValue(32)->create();
    ProductSpec::factory()->for($p2)->for($weightSpec)->numericValue(1.45)->create();
    ProductSpec::factory()->for($p2)->for($gpuSpec)->booleanValue(true)->create();
    ProductSpec::factory()->for($p2)->for($panelSpec)->textValue('OLED')->create();

    $p3 = Product::factory()->for($laptops)->for($brandApple)->outOfStock()->create([
        'price' => '169900.00',
    ]);
    ProductSpec::factory()->for($p3)->for($ramSpec)->numericValue(24)->create();
    ProductSpec::factory()->for($p3)->for($weightSpec)->numericValue(1.19)->create();
    ProductSpec::factory()->for($p3)->for($gpuSpec)->booleanValue(false)->create();
    ProductSpec::factory()->for($p3)->for($panelSpec)->textValue('IPS')->create();

    // Unpublished and soft-deleted products must never pollute price_range, brands, availability, or specs.
    $unpublished = Product::factory()->unpublished()->for($laptops)->for($brandUnpublishedOnly)->create([
        'price' => '9999.00',
    ]);
    ProductSpec::factory()->for($unpublished)->for($ramSpec)->numericValue(4)->create();
    ProductSpec::factory()->for($unpublished)->for($panelSpec)->textValue('TN')->create();

    $trashed = Product::factory()->trashed()->for($laptops)->for($brandUnpublishedOnly)->create([
        'price' => '299999.00',
    ]);
    ProductSpec::factory()->for($trashed)->for($ramSpec)->numericValue(128)->create();
    ProductSpec::factory()->for($trashed)->for($panelSpec)->textValue('CRT')->create();

    // Published product in a different category must not leak here.
    Product::factory()->for($otherCategory)->for($brandOtherCategory)->create(['price' => '15000.00']);

    // Blank text spec value must be ignored cleanly.
    $p4BlankSpec = Product::factory()->for($laptops)->for($brandApple)->create([
        'price' => '89900.00',
    ]);
    ProductSpec::factory()->for($p4BlankSpec)->for($panelSpec)->textValue('   ')->create();

    $response = $this->getJson('/api/v1/categories/laptops/filters');

    $response->assertOk()
        ->assertHeader('X-Request-Id')
        ->assertHeader('X-RateLimit-Limit', '120')
        ->assertExactJson([
            'data' => [
                'category' => [
                    'id' => $laptops->id,
                    'parent_id' => null,
                    'name' => 'Laptops',
                    'slug' => 'laptops',
                    'description' => $laptops->description,
                    'image_url' => '/storage/categories/laptops.svg',
                    'sort_order' => 1,
                    'products_count' => 4,
                ],
                'price_range' => [
                    'min' => [
                        'amount' => '42999.00',
                        'currency' => 'INR',
                    ],
                    'max' => [
                        'amount' => '169900.00',
                        'currency' => 'INR',
                    ],
                ],
                'brands' => [
                    [
                        'id' => $brandApple->id,
                        'name' => 'Apple',
                        'slug' => 'apple',
                        'logo_url' => '/storage/brands/apple.svg',
                        'products_count' => 2,
                    ],
                    [
                        'id' => $brandLenovo->id,
                        'name' => 'Lenovo',
                        'slug' => 'lenovo',
                        'logo_url' => '/storage/brands/lenovo.svg',
                        'products_count' => 2,
                    ],
                ],
                'availability' => [
                    [
                        'value' => 'in_stock',
                        'label' => 'In Stock',
                        'products_count' => 2,
                    ],
                    [
                        'value' => 'low_stock',
                        'label' => 'Low Stock',
                        'products_count' => 1,
                    ],
                    [
                        'value' => 'out_of_stock',
                        'label' => 'Out of Stock',
                        'products_count' => 1,
                    ],
                ],
                'specs' => [
                    [
                        'key' => 'ram_gb',
                        'label' => 'RAM',
                        'unit' => 'GB',
                        'data_type' => 'number',
                        'range' => [
                            'min' => 16,
                            'max' => 32,
                        ],
                    ],
                    [
                        'key' => 'weight_kg',
                        'label' => 'Weight',
                        'unit' => 'kg',
                        'data_type' => 'number',
                        'range' => [
                            'min' => 1.19,
                            'max' => 1.62,
                        ],
                    ],
                    [
                        'key' => 'dedicated_gpu',
                        'label' => 'Dedicated GPU',
                        'unit' => null,
                        'data_type' => 'boolean',
                        'options' => [
                            [
                                'value' => true,
                                'label' => 'Yes',
                                'products_count' => 1,
                            ],
                            [
                                'value' => false,
                                'label' => 'No',
                                'products_count' => 2,
                            ],
                        ],
                    ],
                    [
                        'key' => 'display_panel',
                        'label' => 'Display Panel',
                        'unit' => null,
                        'data_type' => 'text',
                        'options' => [
                            [
                                'value' => 'IPS',
                                'label' => 'IPS',
                                'products_count' => 2,
                            ],
                            [
                                'value' => 'OLED',
                                'label' => 'OLED',
                                'products_count' => 1,
                            ],
                        ],
                    ],
                ],
            ],
        ]);
});

test('category filters handle categories without filterable specs and categories with zero published products', function (): void {
    $noSpecsCategory = Category::factory()->create(['name' => 'Accessories', 'slug' => 'accessories']);
    $brand = Brand::factory()->create(['name' => 'Belkin', 'slug' => 'belkin']);

    SpecDefinition::factory()->for($noSpecsCategory)->text()->create([
        'key' => 'material',
        'is_filterable' => false,
    ]);
    Product::factory()->for($noSpecsCategory)->for($brand)->create(['price' => '1999.00']);

    $this->getJson('/api/v1/categories/accessories/filters')
        ->assertOk()
        ->assertJsonPath('data.category.products_count', 1)
        ->assertJsonPath('data.price_range.min.amount', '1999.00')
        ->assertJsonPath('data.price_range.max.amount', '1999.00')
        ->assertJsonPath('data.specs', []);

    $emptyCategory = Category::factory()->create(['name' => 'Cameras', 'slug' => 'cameras']);
    SpecDefinition::factory()->for($emptyCategory)->numeric('MP', true)->filterable()->create([
        'key' => 'megapixels',
        'label' => 'Resolution',
        'sort_order' => 1,
    ]);
    SpecDefinition::factory()->for($emptyCategory)->boolean(true)->filterable()->create([
        'key' => 'ibis',
        'label' => 'IBIS',
        'sort_order' => 2,
    ]);

    Product::factory()->unpublished()->for($emptyCategory)->for($brand)->create(['price' => '50000.00']);

    $this->getJson('/api/v1/categories/cameras/filters')
        ->assertOk()
        ->assertExactJson([
            'data' => [
                'category' => [
                    'id' => $emptyCategory->id,
                    'parent_id' => null,
                    'name' => 'Cameras',
                    'slug' => 'cameras',
                    'description' => $emptyCategory->description,
                    'image_url' => null,
                    'sort_order' => 0,
                    'products_count' => 0,
                ],
                'price_range' => [
                    'min' => null,
                    'max' => null,
                ],
                'brands' => [],
                'availability' => [
                    ['value' => 'in_stock', 'label' => 'In Stock', 'products_count' => 0],
                    ['value' => 'low_stock', 'label' => 'Low Stock', 'products_count' => 0],
                    ['value' => 'out_of_stock', 'label' => 'Out of Stock', 'products_count' => 0],
                ],
                'specs' => [
                    [
                        'key' => 'megapixels',
                        'label' => 'Resolution',
                        'unit' => 'MP',
                        'data_type' => 'number',
                        'range' => ['min' => null, 'max' => null],
                    ],
                    [
                        'key' => 'ibis',
                        'label' => 'IBIS',
                        'unit' => null,
                        'data_type' => 'boolean',
                        'options' => [],
                    ],
                ],
            ],
        ]);
});

test('parent category filters aggregate published products across active descendant categories', function (): void {
    $computers = Category::factory()->create(['name' => 'Computers', 'slug' => 'computers']);
    $laptops = Category::factory()->childOf($computers)->create(['name' => 'Laptops', 'slug' => 'laptops']);
    $inactiveChild = Category::factory()->inactive()->childOf($computers)->create(['slug' => 'legacy-pcs']);

    $apple = Brand::factory()->create(['name' => 'Apple', 'slug' => 'apple']);
    $dell = Brand::factory()->create(['name' => 'Dell', 'slug' => 'dell']);

    Product::factory()->for($laptops)->for($apple)->create(['price' => '89900.00']);
    Product::factory()->for($computers)->for($dell)->create(['price' => '54999.00']);
    Product::factory()->for($inactiveChild)->for($dell)->create(['price' => '12000.00']);

    $this->getJson('/api/v1/categories/computers/filters')
        ->assertOk()
        ->assertJsonPath('data.category.products_count', 2)
        ->assertJsonPath('data.price_range.min.amount', '54999.00')
        ->assertJsonPath('data.price_range.max.amount', '89900.00')
        ->assertJsonCount(2, 'data.brands')
        ->assertJsonPath('data.specs', []);
});

test('category filters endpoint returns 404 envelope for unknown, inactive, or orphaned categories', function (): void {
    $inactiveParent = Category::factory()->inactive()->create(['slug' => 'inactive-parent']);
    Category::factory()->childOf($inactiveParent)->create(['slug' => 'orphaned-child']);

    foreach (['does-not-exist', 'inactive-parent', 'orphaned-child'] as $slug) {
        $this->withHeader('X-Request-Id', "req-404-{$slug}")
            ->getJson("/api/v1/categories/{$slug}/filters")
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

test('category filters endpoint batches spec queries with zero lazy loading and constant query count', function (): void {
    $category = Category::factory()->create(['slug' => 'monitors']);
    $brand = Brand::factory()->create();

    $numericDefs = SpecDefinition::factory()->count(4)->for($category)->numeric('Hz', true)->filterable()->create();
    $booleanDefs = SpecDefinition::factory()->count(3)->for($category)->boolean(true)->filterable()->create();
    $textDefs = SpecDefinition::factory()->count(3)->for($category)->text()->filterable()->create();

    $products = Product::factory()->count(10)->for($category)->for($brand)->create();

    foreach ($products as $index => $product) {
        foreach ($numericDefs as $def) {
            ProductSpec::factory()->for($product)->for($def)->numericValue(60 + $index * 10)->create();
        }
        foreach ($booleanDefs as $def) {
            ProductSpec::factory()->for($product)->for($def)->booleanValue($index % 2 === 0)->create();
        }
        foreach ($textDefs as $def) {
            ProductSpec::factory()->for($product)->for($def)->textValue($index % 2 === 0 ? 'IPS' : 'OLED')->create();
        }
    }

    $wasPreventingLazyLoading = Model::preventsLazyLoading();
    Model::preventLazyLoading(true);
    DB::flushQueryLog();
    DB::enableQueryLog();

    try {
        $this->getJson('/api/v1/categories/monitors/filters')
            ->assertOk()
            ->assertJsonCount(10, 'data.specs');

        expect(count(DB::getQueryLog()))->toBeLessThanOrEqual(8);
    } finally {
        DB::disableQueryLog();
        Model::preventLazyLoading($wasPreventingLazyLoading);
    }
});

test('public catalog endpoints apply 120 per minute per IP rate limiter headers', function (): void {
    Category::factory()->create(['slug' => 'laptops']);

    $ipOne = $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.40']);
    $ipOne->getJson('/api/v1/categories')
        ->assertOk()
        ->assertHeader('X-RateLimit-Limit', '120')
        ->assertHeader('X-RateLimit-Remaining', '119');

    $ipOne->getJson('/api/v1/categories/laptops/filters')
        ->assertOk()
        ->assertHeader('X-RateLimit-Limit', '120')
        ->assertHeader('X-RateLimit-Remaining', '118');

    $ipTwo = $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.41']);
    $ipTwo->getJson('/api/v1/categories')
        ->assertOk()
        ->assertHeader('X-RateLimit-Limit', '120')
        ->assertHeader('X-RateLimit-Remaining', '119');
});

test('seeded showcase catalog exposes expected categories and laptop facets', function (): void {
    Storage::fake('public');
    $this->seed(CatalogSeeder::class);

    $categoriesResponse = $this->getJson('/api/v1/categories');
    $categoriesResponse->assertOk()
        ->assertJsonCount(6, 'data')
        ->assertJsonPath('data.0.slug', 'smartphones')
        ->assertJsonPath('data.0.products_count', 10)
        ->assertJsonPath('data.1.slug', 'laptops')
        ->assertJsonPath('data.1.image_url', '/storage/categories/laptops.svg')
        ->assertJsonPath('data.5.slug', 'smartwatches');

    $laptopsFilters = $this->getJson('/api/v1/categories/laptops/filters');
    $laptopsFilters->assertOk()
        ->assertJsonPath('data.category.slug', 'laptops')
        ->assertJsonPath('data.category.products_count', 10)
        ->assertJsonPath('data.price_range.min.amount', '42999.00')
        ->assertJsonPath('data.price_range.max.amount', '169900.00')
        ->assertJsonCount(7, 'data.brands')
        ->assertJsonPath('data.brands.0.name', 'Apple')
        ->assertJsonPath('data.brands.1.name', 'ASUS')
        ->assertJsonCount(7, 'data.specs');

    $specKeys = array_column($laptopsFilters->json('data.specs'), 'key');
    expect($specKeys)->toBe([
        'ram_gb',
        'storage_gb',
        'display_size_in',
        'battery_hours',
        'weight_kg',
        'dedicated_gpu',
        'display_panel',
    ])->not->toContain('refresh_rate_hz', 'processor');
});
