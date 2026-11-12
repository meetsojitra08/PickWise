<?php

declare(strict_types=1);

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Database\Seeders\CatalogSeeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('search vector trigger migration respects driver and rolls back cleanly', function (): void {
    $files = glob(database_path('migrations/*_add_search_vector_triggers_to_products_table.php'));
    expect($files)->toBeArray()->toHaveCount(1);

    $migration = require $files[0];
    expect($migration)->toBeInstanceOf(Migration::class);

    $isPostgres = DB::connection($migration->getConnection())->getDriverName() === 'pgsql';
    expect($migration->shouldRun())->toBe($isPostgres);

    if (! $isPostgres) {
        $migration->up();
        $migration->down();

        return;
    }

    $category = Category::factory()->create(['name' => 'Laptops', 'slug' => 'laptops']);
    $brand = Brand::factory()->create(['name' => 'Lenovo', 'slug' => 'lenovo']);
    $product = Product::factory()->for($category)->for($brand)->create([
        'name' => 'ThinkPad X1 Carbon',
        'summary' => 'Featherweight business ultrabook.',
    ]);

    expect(DB::table('products')->where('id', $product->id)->value('search_vector'))->not->toBeNull();

    $migration->down();
    expect(DB::table('products')->where('id', $product->id)->value('search_vector'))->toBeNull();

    $migration->up();
    expect(DB::table('products')->where('id', $product->id)->value('search_vector'))->not->toBeNull();
});

test('postgres search_vector trigger updates automatically when product, brand, or category changes', function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        expect(DB::getDriverName())->not->toBe('pgsql');

        return;
    }

    $category = Category::factory()->create(['name' => 'Notebooks', 'slug' => 'notebooks']);
    $brand = Brand::factory()->create(['name' => 'AlphaTech', 'slug' => 'alphatech']);
    $product = Product::factory()->for($category)->for($brand)->create([
        'name' => 'Voyager 14',
        'summary' => 'Compact work computer.',
        'description' => 'All-day battery.',
    ]);

    $this->getJson('/api/v1/products?q=alphatech')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $product->id);

    $brand->update(['name' => 'BetaCorp']);
    $this->getJson('/api/v1/products?q=alphatech')->assertOk()->assertJsonPath('meta.total', 0);
    $this->getJson('/api/v1/products?q=betacorp')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $product->id);

    $category->update(['name' => 'Workstations']);
    $this->getJson('/api/v1/products?q=workstations')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $product->id);

    $product->update(['name' => 'StudioPro 16']);
    $this->getJson('/api/v1/products?q=studiopro')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $product->id);
});

test('postgres full-text search handles unaccent, prefix matching, special characters, and relevance weights', function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        expect(DB::getDriverName())->not->toBe('pgsql');

        return;
    }

    $laptops = Category::factory()->create(['name' => 'Laptops', 'slug' => 'laptops']);
    $accessories = Category::factory()->create(['name' => 'Accessories', 'slug' => 'accessories']);
    $brand = Brand::factory()->create(['name' => 'Apple', 'slug' => 'apple']);

    $macbook = Product::factory()->for($laptops)->for($brand)->withValueScore(70)->create([
        'name' => 'MacBook Air M3',
        'summary' => 'Fanless aluminum ultrabook.',
        'description' => 'Designed for everyday portability.',
    ]);
    $cafeBoard = Product::factory()->for($accessories)->for($brand)->withValueScore(95)->create([
        'name' => 'Café Creator Keyboard',
        'summary' => 'Quiet scissor switches for laptop users.',
        'description' => 'Pairs cleanly with any laptop setup.',
    ]);
    $touchIdBoard = Product::factory()->for($accessories)->for($brand)->withValueScore(85)->create([
        'name' => 'Magic Keyboard with Touch ID',
        'summary' => 'Wireless aluminum deck.',
        'description' => 'Long-lasting rechargeable battery.',
    ]);

    // Weighted FTS ranks category 'Laptops' (weight B) ahead of summary/description 'laptop' mentions (weight C/D).
    $laptopSearch = $this->getJson('/api/v1/products?q=laptop')->assertOk();
    expect(array_column($laptopSearch->json('data'), 'id'))->toBe([
        $macbook->id,
        $cafeBoard->id,
    ]);

    // Prefix FTS matches partial words like 'macb'.
    $this->getJson('/api/v1/products?q=macb')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $macbook->id);

    // Unaccent matches both accented and ASCII queries.
    $this->getJson('/api/v1/products?q=cafe')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $cafeBoard->id);

    $this->getJson('/api/v1/products?q='.urlencode('café'))
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $cafeBoard->id);

    // Query containing an English stopword ('with') still matches via combined tsquery.
    $this->getJson('/api/v1/products?q='.urlencode('keyboard with touch id'))
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $touchIdBoard->id);

    // Special tsquery operator syntax or symbol-only inputs never throw 500 errors.
    $this->getJson('/api/v1/products?q='.urlencode('macbook & | ! : ( ) *'))
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $macbook->id);

    $this->getJson('/api/v1/products?q='.urlencode('???'))
        ->assertOk()
        ->assertJsonPath('meta.total', 0)
        ->assertJsonPath('data', []);
});

test('postgres trigram typo tolerance finds seeded laptops for "laptp" and handles multi-word typos and filters', function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        expect(DB::getDriverName())->not->toBe('pgsql');

        return;
    }

    Storage::fake('public');
    $this->seed(CatalogSeeder::class);

    // Acceptance criterion: searching "laptp" (typo) finds all 10 laptops and ranks them first.
    $typoLaptops = $this->getJson('/api/v1/products?q=laptp')->assertOk();
    $items = $typoLaptops->json('data');

    expect($typoLaptops->json('meta.total'))->toBeGreaterThanOrEqual(10);
    $topTenCategories = array_map(
        static fn (array $item): string => $item['category']['slug'],
        array_slice($items, 0, 10),
    );
    expect($topTenCategories)->toBe(array_fill(0, 10, 'laptops'));

    // Multi-word partial typo: exact brand + typo category narrows strictly to ASUS laptops.
    $asusLaptops = $this->getJson('/api/v1/products?q='.urlencode('asus laptp'))->assertOk();
    expect($asusLaptops->json('meta.total'))->toBe(2);
    expect(array_column($asusLaptops->json('data'), 'slug'))
        ->toEqualCanonicalizing(['asus-vivobook-16-oled-creator', 'asus-tuf-gaming-a15-rtx']);

    // Other realistic category/brand/product typos across seeded catalog.
    $this->getJson('/api/v1/products?q=macbok')
        ->assertOk()
        ->assertJsonPath('meta.total', 2);

    $this->getJson('/api/v1/products?q='.urlencode('dell moniter'))
        ->assertOk()
        ->assertJsonPath('meta.total', 2);

    $this->getJson('/api/v1/products?q='.urlencode('aple headphne'))
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.slug', 'apple-airpods-max-usbc');

    $this->getJson('/api/v1/products?q='.urlencode('samsng smartwtch'))
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.slug', 'samsung-galaxy-watch-7-44');

    // Typo search combined with explicit sort override.
    $sortedTypo = $this->getJson('/api/v1/products?q=laptp&category=laptops&sort=price_asc')->assertOk();
    $sortedPrices = array_map(
        static fn (array $item): float => (float) $item['price']['amount'],
        $sortedTypo->json('data'),
    );
    $expectedPrices = $sortedPrices;
    sort($expectedPrices);
    expect($sortedTypo->json('meta.total'))->toBe(10)
        ->and($sortedPrices)->toBe($expectedPrices);

    // Active category filter prevents trigram fallback from leaking products outside the filter.
    $this->getJson('/api/v1/products?q=laptp&category=smartphones')
        ->assertOk()
        ->assertJsonPath('meta.total', 0)
        ->assertJsonPath('data', []);

    // Page beyond last page of a valid search preserves FTS total without invoking trigram fallback.
    $this->getJson('/api/v1/products?q=laptop&page=99')
        ->assertOk()
        ->assertJsonPath('meta.total', 16)
        ->assertJsonCount(0, 'data');
});

test('postgres trigram fallback respects visibility boundaries and executes without lazy loading', function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        expect(DB::getDriverName())->not->toBe('pgsql');

        return;
    }

    $laptops = Category::factory()->create(['name' => 'Laptops', 'slug' => 'laptops']);
    $inactiveCategory = Category::factory()->inactive()->create(['name' => 'Laptops Archive', 'slug' => 'laptops-archive']);
    $brand = Brand::factory()->create(['name' => 'Lenovo', 'slug' => 'lenovo']);

    $visible = Product::factory()->for($laptops)->for($brand)->create([
        'name' => 'ThinkPad X1 Carbon',
    ]);
    Product::factory()->unpublished()->for($laptops)->for($brand)->create([
        'name' => 'ThinkPad Draft',
    ]);
    Product::factory()->trashed()->for($laptops)->for($brand)->create([
        'name' => 'ThinkPad Deleted',
    ]);
    Product::factory()->for($inactiveCategory)->for($brand)->create([
        'name' => 'ThinkPad Archived',
    ]);

    $wasPreventingLazyLoading = Model::preventsLazyLoading();
    Model::preventLazyLoading(true);
    DB::flushQueryLog();
    DB::enableQueryLog();

    try {
        $this->getJson('/api/v1/products?q=thinkpd')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $visible->id);

        expect(count(DB::getQueryLog()))->toBeLessThanOrEqual(8);
    } finally {
        DB::disableQueryLog();
        Model::preventLazyLoading($wasPreventingLazyLoading);
    }
});
