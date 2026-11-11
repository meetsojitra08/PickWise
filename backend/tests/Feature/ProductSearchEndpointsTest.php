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

test('products endpoint returns only published products in active categories with canonical resource shape', function (): void {
    $activeCategory = Category::factory()->create([
        'name' => 'Laptops',
        'slug' => 'laptops',
    ]);
    $inactiveCategory = Category::factory()->inactive()->create([
        'name' => 'Archived',
        'slug' => 'archived',
    ]);
    $orphanedCategory = Category::factory()->childOf($inactiveCategory)->create([
        'name' => 'Orphaned',
        'slug' => 'orphaned',
    ]);

    $brand = Brand::factory()->withLogo('brands/lenovo.svg')->create([
        'name' => 'Lenovo',
        'slug' => 'lenovo',
    ]);

    $this->travelTo(now()->setDate(2026, 11, 10)->setTime(12, 30, 0));

    $withImage = Product::factory()
        ->for($activeCategory)
        ->for($brand)
        ->withRating(4.65, 42)
        ->withValueScore(91)
        ->create([
            'name' => 'ThinkPad X1 Carbon',
            'slug' => 'thinkpad-x1-carbon',
            'summary' => 'Featherweight 14-inch business ultrabook.',
            'price' => '139999.00',
            'availability' => ProductAvailability::InStock->value,
        ]);

    $primaryImage = ProductImage::factory()->for($withImage)->primary()->create([
        'path' => 'products/laptops/thinkpad-x1-1.svg',
        'alt_text' => 'ThinkPad X1 Carbon front view',
    ]);
    ProductImage::factory()->for($withImage)->create([
        'path' => 'products/laptops/thinkpad-x1-2.svg',
        'is_primary' => false,
        'sort_order' => 1,
    ]);

    $withoutPrimary = Product::factory()
        ->for($activeCategory)
        ->for($brand)
        ->lowStock()
        ->withRating(4.20, 10)
        ->create([
            'name' => 'IdeaPad Slim 5',
            'slug' => 'ideapad-slim-5',
            'summary' => 'Everyday OLED student notebook.',
            'price' => '64999.00',
            'value_score' => null,
        ]);

    // Hidden products: unpublished, soft-deleted, inactive category, orphaned category.
    Product::factory()->unpublished()->for($activeCategory)->for($brand)->create(['name' => 'Hidden Draft']);
    Product::factory()->trashed()->for($activeCategory)->for($brand)->create(['name' => 'Deleted Laptop']);
    Product::factory()->for($inactiveCategory)->for($brand)->create(['name' => 'Inactive Cat Laptop']);
    Product::factory()->for($orphanedCategory)->for($brand)->create(['name' => 'Orphaned Cat Laptop']);

    $response = $this->getJson('/api/v1/products');

    $response->assertOk()
        ->assertHeader('X-Request-Id')
        ->assertHeader('X-RateLimit-Limit', '120')
        ->assertJsonPath('meta.current_page', 1)
        ->assertJsonPath('meta.per_page', 24)
        ->assertJsonPath('meta.total', 2)
        ->assertJsonPath('meta.last_page', 1)
        ->assertJsonStructure([
            'data',
            'meta' => ['current_page', 'per_page', 'total', 'last_page'],
            'links' => ['first', 'last', 'prev', 'next'],
        ])
        ->assertJson([
            'data' => [
                [
                    'id' => $withImage->id,
                    'name' => 'ThinkPad X1 Carbon',
                    'slug' => 'thinkpad-x1-carbon',
                    'summary' => 'Featherweight 14-inch business ultrabook.',
                    'price' => [
                        'amount' => '139999.00',
                        'currency' => 'INR',
                    ],
                    'availability' => 'in_stock',
                    'availability_label' => 'In Stock',
                    'rating_avg' => 4.65,
                    'rating_count' => 42,
                    'value_score' => 91,
                    'category' => [
                        'id' => $activeCategory->id,
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
                        'url' => '/storage/products/laptops/thinkpad-x1-1.svg',
                        'alt_text' => 'ThinkPad X1 Carbon front view',
                    ],
                    'created_at' => '2026-11-10T12:30:00Z',
                ],
                [
                    'id' => $withoutPrimary->id,
                    'name' => 'IdeaPad Slim 5',
                    'slug' => 'ideapad-slim-5',
                    'availability' => 'low_stock',
                    'availability_label' => 'Low Stock',
                    'value_score' => null,
                    'primary_image' => null,
                ],
            ],
        ]);

    expect($response->json('data.0'))->not->toHaveKey('search_vector')
        ->and($response->json('data.0'))->not->toHaveKey('is_published');
});

test('products keyword search matches product, brand, and category fields, ranks by relevance, and escapes wildcards', function (): void {
    $miceCategory = Category::factory()->create(['name' => 'Gaming Peripherals', 'slug' => 'gaming-peripherals']);
    $monitorsCategory = Category::factory()->create(['name' => 'Monitors', 'slug' => 'monitors']);
    $logitech = Brand::factory()->create(['name' => 'Logitech', 'slug' => 'logitech']);
    $benq = Brand::factory()->create(['name' => 'BenQ', 'slug' => 'benq']);

    $exactMatch = Product::factory()->for($miceCategory)->for($logitech)->withValueScore(70)->create([
        'name' => 'Gaming Mouse',
        'summary' => 'Lightweight wireless sensor.',
        'description' => 'Precision esports mouse.',
    ]);
    $prefixMatch = Product::factory()->for($miceCategory)->for($logitech)->withValueScore(95)->create([
        'name' => 'Gaming Mouse Pro X',
        'summary' => 'Pro esports wireless design.',
        'description' => 'High polling rate.',
    ]);
    $descriptionOnlyMatch = Product::factory()->for($monitorsCategory)->for($benq)->withValueScore(99)->create([
        'name' => 'Zowie XL2546K',
        'summary' => '240Hz esports display.',
        'description' => 'Built to pair with a fast gaming mouse setup.',
    ]);
    $brandAndCategoryMatch = Product::factory()->for($miceCategory)->for($logitech)->withValueScore(80)->create([
        'name' => 'G Pro Wireless',
        'summary' => 'Precision tracking sensor.',
        'description' => 'Zero-latency wireless connection.',
    ]);
    $literalPercent = Product::factory()->for($miceCategory)->for($logitech)->create([
        'name' => '100% Mechanical Keycap Set',
        'summary' => 'PBT doubleshot legends with 50_off bundle.',
        'description' => 'Durable keycaps.',
    ]);
    Product::factory()->for($miceCategory)->for($logitech)->create([
        'name' => '1000Hz Receiver Dongle',
        'summary' => '500off promotional receiver.',
        'description' => 'Low latency receiver.',
    ]);

    // Default sort with `q` must be relevance: exact name > prefix name > description-only (even though value_score is higher).
    $searchResponse = $this->getJson('/api/v1/products?q=gaming%20mouse');
    $searchResponse->assertOk()
        ->assertJsonPath('meta.total', 3);

    expect(array_column($searchResponse->json('data'), 'id'))->toBe([
        $exactMatch->id,
        $prefixMatch->id,
        $descriptionOnlyMatch->id,
    ]);

    // Brand + category name tokens both participate in keyword matching.
    $brandResponse = $this->getJson('/api/v1/products?q=logitech%20peripherals');
    $brandResponse->assertOk()
        ->assertJsonPath('meta.total', 5);
    expect(array_column($brandResponse->json('data'), 'id'))->toContain($brandAndCategoryMatch->id);

    // LIKE wildcards (`%` and `_`) must match literally, not act as SQL wildcards.
    $percentResponse = $this->getJson('/api/v1/products?q='.urlencode('100%'));
    $percentResponse->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $literalPercent->id);

    $underscoreResponse = $this->getJson('/api/v1/products?q='.urlencode('50_off'));
    $underscoreResponse->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $literalPercent->id);

    // Whitespace-only q falls back to unfiltered listing ordered by value_score.
    $emptySearch = $this->getJson('/api/v1/products?q=%20%20%20');
    $emptySearch->assertOk()
        ->assertJsonPath('meta.total', 6)
        ->assertJsonPath('data.0.id', $descriptionOnlyMatch->id);
});

test('products endpoint filters by category hierarchy, brands, price bounds, rating, availability, and combined conditions', function (): void {
    $computers = Category::factory()->create(['name' => 'Computers', 'slug' => 'computers']);
    $laptops = Category::factory()->childOf($computers)->create(['name' => 'Laptops', 'slug' => 'laptops']);
    $inactiveChild = Category::factory()->inactive()->childOf($computers)->create(['slug' => 'legacy-pcs']);
    $audio = Category::factory()->create(['name' => 'Audio', 'slug' => 'audio']);

    $apple = Brand::factory()->create(['name' => 'Apple', 'slug' => 'apple']);
    $asus = Brand::factory()->create(['name' => 'ASUS', 'slug' => 'asus']);
    $sony = Brand::factory()->create(['name' => 'Sony', 'slug' => 'sony']);

    $pLaptopCheap = Product::factory()->for($laptops)->for($asus)->withRating(4.10, 12)->create([
        'price' => '49999.00',
        'availability' => ProductAvailability::InStock->value,
    ]);
    $pLaptopMid = Product::factory()->for($laptops)->for($apple)->withRating(4.80, 50)->lowStock()->create([
        'price' => '89900.00',
    ]);
    $pComputerDirect = Product::factory()->for($computers)->for($asus)->withRating(4.50, 20)->outOfStock()->create([
        'price' => '64999.50',
    ]);
    Product::factory()->for($inactiveChild)->for($asus)->create(['price' => '30000.00']);
    $pAudio = Product::factory()->for($audio)->for($sony)->withRating(4.90, 90)->create([
        'price' => '29990.00',
        'availability' => ProductAvailability::InStock->value,
    ]);

    // Parent category includes itself and active children, excludes inactive child and unrelated categories.
    $parentCategoryResp = $this->getJson('/api/v1/products?category=computers');
    $parentCategoryResp->assertOk()->assertJsonPath('meta.total', 3);
    expect(array_column($parentCategoryResp->json('data'), 'id'))
        ->toEqualCanonicalizing([$pLaptopCheap->id, $pLaptopMid->id, $pComputerDirect->id]);

    // Unknown or inactive category returns empty collection cleanly.
    $this->getJson('/api/v1/products?category=does-not-exist')
        ->assertOk()
        ->assertJsonPath('meta.total', 0)
        ->assertJsonPath('data', []);
    $this->getJson('/api/v1/products?category=legacy-pcs')
        ->assertOk()
        ->assertJsonPath('meta.total', 0);

    // Multi-brand filter.
    $brandResp = $this->getJson('/api/v1/products?brand[]=apple&brand[]=sony');
    $brandResp->assertOk()->assertJsonPath('meta.total', 2);
    expect(array_column($brandResp->json('data'), 'id'))
        ->toEqualCanonicalizing([$pLaptopMid->id, $pAudio->id]);

    // Inclusive price_min and price_max.
    $priceResp = $this->getJson('/api/v1/products?price_min=49999&price_max=64999.50');
    $priceResp->assertOk()->assertJsonPath('meta.total', 2);
    expect(array_column($priceResp->json('data'), 'id'))
        ->toEqualCanonicalizing([$pLaptopCheap->id, $pComputerDirect->id]);

    // Rating min.
    $ratingResp = $this->getJson('/api/v1/products?rating_min=4.8');
    $ratingResp->assertOk()->assertJsonPath('meta.total', 2);
    expect(array_column($ratingResp->json('data'), 'id'))
        ->toEqualCanonicalizing([$pLaptopMid->id, $pAudio->id]);

    // Availability.
    $this->getJson('/api/v1/products?availability=low_stock')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $pLaptopMid->id);

    // Combined filters narrowing to a single item.
    $this->getJson('/api/v1/products?category=laptops&brand[]=apple&price_min=80000&price_max=100000&rating_min=4.5&availability=low_stock')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $pLaptopMid->id);

    // Combined filters returning zero results.
    $this->getJson('/api/v1/products?category=laptops&brand[]=sony')
        ->assertOk()
        ->assertJsonPath('meta.total', 0)
        ->assertJsonPath('data', []);
});

test('products endpoint filters by numeric, boolean, and text specs while safely ignoring unknown or non-filterable keys', function (): void {
    $laptops = Category::factory()->create(['slug' => 'laptops']);
    $brand = Brand::factory()->create();

    $ramSpec = SpecDefinition::factory()->for($laptops)->numeric('GB', true)->filterable()->create(['key' => 'ram_gb']);
    $weightSpec = SpecDefinition::factory()->for($laptops)->numeric('kg', false)->filterable()->create(['key' => 'weight_kg']);
    $gpuSpec = SpecDefinition::factory()->for($laptops)->boolean(true)->filterable()->create(['key' => 'dedicated_gpu']);
    $panelSpec = SpecDefinition::factory()->for($laptops)->text()->filterable()->create(['key' => 'display_panel']);
    $cpuSpec = SpecDefinition::factory()->for($laptops)->text()->create(['key' => 'processor', 'is_filterable' => false]);

    $ultrabook = Product::factory()->for($laptops)->for($brand)->create(['name' => 'Ultrabook 16']);
    ProductSpec::factory()->for($ultrabook)->for($ramSpec)->numericValue(16)->create();
    ProductSpec::factory()->for($ultrabook)->for($weightSpec)->numericValue(1.19)->create();
    ProductSpec::factory()->for($ultrabook)->for($gpuSpec)->booleanValue(false)->create();
    ProductSpec::factory()->for($ultrabook)->for($panelSpec)->textValue('IPS')->create();
    ProductSpec::factory()->for($ultrabook)->for($cpuSpec)->textValue('M3')->create();

    $creator = Product::factory()->for($laptops)->for($brand)->create(['name' => 'Creator OLED 32']);
    ProductSpec::factory()->for($creator)->for($ramSpec)->numericValue(32)->create();
    ProductSpec::factory()->for($creator)->for($weightSpec)->numericValue(1.48)->create();
    ProductSpec::factory()->for($creator)->for($gpuSpec)->booleanValue(true)->create();
    ProductSpec::factory()->for($creator)->for($panelSpec)->textValue('OLED')->create();

    $budget = Product::factory()->for($laptops)->for($brand)->create(['name' => 'Budget 8']);
    ProductSpec::factory()->for($budget)->for($ramSpec)->numericValue(8)->create();
    ProductSpec::factory()->for($budget)->for($weightSpec)->numericValue(1.85)->create();
    ProductSpec::factory()->for($budget)->for($gpuSpec)->booleanValue(false)->create();
    ProductSpec::factory()->for($budget)->for($panelSpec)->textValue('TN')->create();

    // Numeric range (min:max), open upper bound (min:), open lower bound (:max), exact number.
    $rangeResp = $this->getJson('/api/v1/products?category=laptops&spec[ram_gb]=16:32&spec[weight_kg]=:1.5');
    $rangeResp->assertOk()->assertJsonPath('meta.total', 2);
    expect(array_column($rangeResp->json('data'), 'id'))
        ->toEqualCanonicalizing([$ultrabook->id, $creator->id]);

    $this->getJson('/api/v1/products?category=laptops&spec[ram_gb]=24:')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $creator->id);

    $this->getJson('/api/v1/products?category=laptops&spec[ram_gb]=16')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $ultrabook->id);

    // Boolean spec filter (false and true).
    $this->getJson('/api/v1/products?category=laptops&spec[dedicated_gpu]=true')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $creator->id);

    $noGpuResp = $this->getJson('/api/v1/products?category=laptops&spec[dedicated_gpu]=false');
    $noGpuResp->assertOk()->assertJsonPath('meta.total', 2);
    expect(array_column($noGpuResp->json('data'), 'id'))
        ->toEqualCanonicalizing([$ultrabook->id, $budget->id]);

    // Text spec filter (case-insensitive single value + multi-value array).
    $this->getJson('/api/v1/products?category=laptops&spec[display_panel]=oled')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $creator->id);

    $multiTextResp = $this->getJson('/api/v1/products?category=laptops&spec[display_panel][]=ips&spec[display_panel][]=oled');
    $multiTextResp->assertOk()->assertJsonPath('meta.total', 2);
    expect(array_column($multiTextResp->json('data'), 'id'))
        ->toEqualCanonicalizing([$ultrabook->id, $creator->id]);

    // Spec filter without category + blank spec value + unknown/non-filterable spec keys safely ignored.
    $this->getJson('/api/v1/products?spec[ram_gb]=32&spec[unknown_spec]=foo&spec[processor]=Intel&spec[weight_kg]=')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $creator->id);
});

test('products endpoint supports all sorting modes including nulls-last value ordering', function (): void {
    $category = Category::factory()->create();
    $brand = Brand::factory()->create();

    $oldest = Product::factory()->for($category)->for($brand)->withRating(3.50, 10)->withValueScore(60)->create([
        'name' => 'Model Alpha',
        'price' => '50000.00',
        'created_at' => now()->subDays(10),
    ]);
    $midScored = Product::factory()->for($category)->for($brand)->withRating(4.90, 5)->withValueScore(92)->create([
        'name' => 'Model Beta',
        'price' => '90000.00',
        'created_at' => now()->subDays(5),
    ]);
    $unscoredHighRated = Product::factory()->for($category)->for($brand)->withRating(5.00, 30)->create([
        'name' => 'Model Gamma',
        'price' => '25000.00',
        'value_score' => null,
        'created_at' => now()->subDay(),
    ]);

    // value sort: scored products DESC first, unscored NULL products last.
    $valueResp = $this->getJson('/api/v1/products?sort=value')->assertOk();
    expect(array_column($valueResp->json('data'), 'id'))
        ->toBe([$midScored->id, $oldest->id, $unscoredHighRated->id]);

    $priceAsc = $this->getJson('/api/v1/products?sort=price_asc')->assertOk();
    expect(array_column($priceAsc->json('data'), 'id'))
        ->toBe([$unscoredHighRated->id, $oldest->id, $midScored->id]);

    $priceDesc = $this->getJson('/api/v1/products?sort=price_desc')->assertOk();
    expect(array_column($priceDesc->json('data'), 'id'))
        ->toBe([$midScored->id, $oldest->id, $unscoredHighRated->id]);

    $ratingResp = $this->getJson('/api/v1/products?sort=rating')->assertOk();
    expect(array_column($ratingResp->json('data'), 'id'))
        ->toBe([$unscoredHighRated->id, $midScored->id, $oldest->id]);

    $newestResp = $this->getJson('/api/v1/products?sort=newest')->assertOk();
    expect(array_column($newestResp->json('data'), 'id'))
        ->toBe([$unscoredHighRated->id, $midScored->id, $oldest->id]);
});

test('products endpoint paginates with default 24, preserves query string, and handles out-of-range pages', function (): void {
    $category = Category::factory()->create(['slug' => 'monitors']);
    $brand = Brand::factory()->create(['slug' => 'dell']);

    Product::factory()->count(30)->for($category)->for($brand)->create();

    $defaultPage = $this->getJson('/api/v1/products?category=monitors&sort=price_asc');
    $defaultPage->assertOk()
        ->assertJsonCount(24, 'data')
        ->assertJsonPath('meta.current_page', 1)
        ->assertJsonPath('meta.per_page', 24)
        ->assertJsonPath('meta.total', 30)
        ->assertJsonPath('meta.last_page', 2);

    $nextLink = (string) $defaultPage->json('links.next');
    expect($nextLink)->toContain('category=monitors')
        ->and($nextLink)->toContain('sort=price_asc')
        ->and($nextLink)->toContain('page=2');

    $customPage = $this->getJson('/api/v1/products?per_page=10&page=3');
    $customPage->assertOk()
        ->assertJsonCount(10, 'data')
        ->assertJsonPath('meta.current_page', 3)
        ->assertJsonPath('meta.per_page', 10)
        ->assertJsonPath('meta.last_page', 3);

    $beyondLast = $this->getJson('/api/v1/products?per_page=10&page=99');
    $beyondLast->assertOk()
        ->assertJsonCount(0, 'data')
        ->assertJsonPath('meta.current_page', 99)
        ->assertJsonPath('meta.total', 30)
        ->assertJsonPath('meta.last_page', 3);
});

test('products endpoint validates query parameters and returns 422 validation_failed envelope', function (): void {
    $laptops = Category::factory()->create(['slug' => 'laptops']);
    SpecDefinition::factory()->for($laptops)->numeric('GB', true)->filterable()->create(['key' => 'ram_gb']);
    SpecDefinition::factory()->for($laptops)->boolean(true)->filterable()->create(['key' => 'dedicated_gpu']);

    $invalidCases = [
        'per_page over max' => ['per_page=49', 'per_page'],
        'per_page zero' => ['per_page=0', 'per_page'],
        'page zero' => ['page=0', 'page'],
        'price_min exceeds price_max' => ['price_min=50000&price_max=20000', 'price_max'],
        'negative price' => ['price_min=-100', 'price_min'],
        'non numeric price' => ['price_max=cheap', 'price_max'],
        'scientific price' => ['price_min=1e5', 'price_min'],
        'rating above five' => ['rating_min=5.5', 'rating_min'],
        'invalid availability' => ['availability=discontinued', 'availability'],
        'invalid sort' => ['sort=popularity', 'sort'],
        'query over 200 chars' => ['q='.str_repeat('a', 201), 'q'],
        'brand non array' => ['brand=apple', 'brand'],
        'spec non array' => ['spec=ram_gb', 'spec'],
        'numeric spec non numeric' => ['category=laptops&spec[ram_gb]=abc', 'spec.ram_gb'],
        'numeric spec inverted range' => ['category=laptops&spec[ram_gb]=32:16', 'spec.ram_gb'],
        'numeric spec empty bounds' => ['category=laptops&spec[ram_gb]=:', 'spec.ram_gb'],
        'numeric spec multiple colons' => ['category=laptops&spec[ram_gb]=8:16:32', 'spec.ram_gb'],
        'boolean spec invalid' => ['category=laptops&spec[dedicated_gpu]=maybe', 'spec.dedicated_gpu'],
    ];

    foreach ($invalidCases as $label => [$queryString, $expectedField]) {
        $this->withHeader('X-Request-Id', 'req-422-'.md5($label))
            ->getJson('/api/v1/products?'.$queryString)
            ->assertStatus(422)
            ->assertHeader('X-Request-Id', 'req-422-'.md5($label))
            ->assertJsonPath('error.code', 'validation_failed')
            ->assertJsonPath('error.request_id', 'req-422-'.md5($label))
            ->assertJsonStructure([
                'error' => [
                    'code',
                    'message',
                    'details' => [$expectedField],
                    'request_id',
                ],
            ]);
    }
});

test('products endpoint executes with zero lazy loading and constant query count', function (): void {
    $category = Category::factory()->create(['slug' => 'laptops']);
    $brand = Brand::factory()->create(['slug' => 'apple']);
    $ramSpec = SpecDefinition::factory()->for($category)->numeric('GB', true)->filterable()->create(['key' => 'ram_gb']);

    $products = Product::factory()->count(20)->for($category)->for($brand)->create(['price' => '75000.00']);
    foreach ($products as $product) {
        ProductImage::factory()->for($product)->primary()->create();
        ProductSpec::factory()->for($product)->for($ramSpec)->numericValue(16)->create();
    }

    $wasPreventingLazyLoading = Model::preventsLazyLoading();
    Model::preventLazyLoading(true);
    DB::flushQueryLog();
    DB::enableQueryLog();

    try {
        $this->getJson('/api/v1/products?category=laptops&spec[ram_gb]=8:32&per_page=20')
            ->assertOk()
            ->assertJsonCount(20, 'data');

        expect(count(DB::getQueryLog()))->toBeLessThanOrEqual(8);
    } finally {
        DB::disableQueryLog();
        Model::preventLazyLoading($wasPreventingLazyLoading);
    }
});

test('seeded showcase catalog supports filtered, sorted, and paginated product discovery', function (): void {
    Storage::fake('public');
    $this->seed(CatalogSeeder::class);

    $this->getJson('/api/v1/products')
        ->assertOk()
        ->assertJsonCount(24, 'data')
        ->assertJsonPath('meta.total', 60)
        ->assertJsonPath('meta.last_page', 3);

    $filteredLaptops = $this->getJson('/api/v1/products?category=laptops&spec[ram_gb]=16:32&spec[dedicated_gpu]=true&price_max=150000&sort=price_asc');
    $filteredLaptops->assertOk();

    $items = $filteredLaptops->json('data');
    expect($items)->not->toBeEmpty();

    $prices = array_map(
        static fn (array $item): float => (float) $item['price']['amount'],
        $items,
    );
    $sortedPrices = $prices;
    sort($sortedPrices);

    expect($prices)->toBe($sortedPrices);

    foreach ($items as $item) {
        expect($item['category']['slug'])->toBe('laptops')
            ->and((float) $item['price']['amount'])->toBeLessThanOrEqual(150000.0);
    }
});
