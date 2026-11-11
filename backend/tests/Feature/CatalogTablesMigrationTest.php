<?php

declare(strict_types=1);

use App\Enums\ProductAvailability;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('categories, brands, products, and product_images tables have expected columns and indexes', function (): void {
    expect(Schema::hasColumns('categories', [
        'id',
        'parent_id',
        'name',
        'slug',
        'description',
        'image_path',
        'sort_order',
        'is_active',
        'created_at',
        'updated_at',
    ]))->toBeTrue()
        ->and(Schema::hasIndex('categories', ['slug'], 'unique'))->toBeTrue()
        ->and(Schema::hasIndex('categories', ['parent_id']))->toBeTrue()
        ->and(Schema::hasIndex('categories', ['is_active', 'sort_order']))->toBeTrue();

    expect(Schema::hasColumns('brands', [
        'id',
        'name',
        'slug',
        'logo_path',
        'created_at',
        'updated_at',
    ]))->toBeTrue()
        ->and(Schema::hasIndex('brands', ['slug'], 'unique'))->toBeTrue()
        ->and(Schema::hasIndex('brands', ['name']))->toBeTrue();

    expect(Schema::hasColumns('products', [
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
        'store_url',
        'rating_avg',
        'rating_count',
        'value_score',
        'is_published',
        'search_vector',
        'deleted_at',
        'created_at',
        'updated_at',
    ]))->toBeTrue()
        ->and(Schema::hasIndex('products', ['slug'], 'unique'))->toBeTrue()
        ->and(Schema::hasIndex('products', ['category_id', 'is_published', 'price']))->toBeTrue()
        ->and(Schema::hasIndex('products', ['brand_id']))->toBeTrue()
        ->and(Schema::hasIndex('products', ['price']))->toBeTrue()
        ->and(Schema::hasIndex('products', ['is_published']))->toBeTrue()
        ->and(Schema::hasIndex('products', ['rating_avg']))->toBeTrue();

    expect(Schema::hasColumns('product_images', [
        'id',
        'product_id',
        'path',
        'alt_text',
        'sort_order',
        'is_primary',
        'created_at',
        'updated_at',
    ]))->toBeTrue()
        ->and(Schema::hasIndex('product_images', ['product_id', 'is_primary', 'sort_order']))->toBeTrue();

    if (DB::getDriverName() === 'pgsql') {
        expect(Schema::hasIndex('products', ['search_vector']))->toBeTrue()
            ->and(Schema::hasIndex('products', ['name']))->toBeTrue();

        $categoryColumns = collect(DB::select(
            "SELECT column_name, data_type, character_maximum_length, is_nullable
             FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'categories'"
        ))->keyBy('column_name');

        expect($categoryColumns->get('name')?->character_maximum_length)->toBe(120)
            ->and($categoryColumns->get('parent_id')?->is_nullable)->toBe('YES')
            ->and($categoryColumns->get('is_active')?->data_type)->toBe('boolean');

        $productColumns = collect(DB::select(
            "SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale, is_nullable
             FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'products'"
        ))->keyBy('column_name');

        expect($productColumns->get('name')?->character_maximum_length)->toBe(200)
            ->and($productColumns->get('summary')?->character_maximum_length)->toBe(300)
            ->and($productColumns->get('price')?->data_type)->toBe('numeric')
            ->and($productColumns->get('price')?->numeric_precision)->toBe(12)
            ->and($productColumns->get('price')?->numeric_scale)->toBe(2)
            ->and($productColumns->get('currency')?->data_type)->toBe('character')
            ->and($productColumns->get('currency')?->character_maximum_length)->toBe(3)
            ->and($productColumns->get('availability')?->character_maximum_length)->toBe(20)
            ->and($productColumns->get('store_url')?->character_maximum_length)->toBe(2048)
            ->and($productColumns->get('store_url')?->is_nullable)->toBe('YES')
            ->and($productColumns->get('rating_avg')?->numeric_precision)->toBe(3)
            ->and($productColumns->get('rating_avg')?->numeric_scale)->toBe(2)
            ->and($productColumns->get('value_score')?->data_type)->toBe('smallint')
            ->and($productColumns->get('value_score')?->is_nullable)->toBe('YES')
            ->and($productColumns->get('is_published')?->data_type)->toBe('boolean')
            ->and($productColumns->get('search_vector')?->data_type)->toBe('tsvector')
            ->and($productColumns->get('deleted_at')?->is_nullable)->toBe('YES');

        $pgIndexes = collect(DB::select(
            "SELECT indexname, indexdef
             FROM pg_indexes
             WHERE schemaname = 'public' AND tablename = 'products'"
        ))->keyBy('indexname');

        expect($pgIndexes->get('products_search_vector_index')?->indexdef)->toContain('USING gin (search_vector)')
            ->and($pgIndexes->get('products_name_trgm_gin_index')?->indexdef)->toContain('USING gin (name gin_trgm_ops)')
            ->and($pgIndexes->get('products_rating_avg_desc_index')?->indexdef)->toContain('(rating_avg DESC)');
    }
});

test('catalog tables apply expected default column values', function (): void {
    $now = now();

    $categoryId = DB::table('categories')->insertGetId([
        'name' => 'Laptops',
        'slug' => 'laptops',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $brandId = DB::table('brands')->insertGetId([
        'name' => 'Lenovo',
        'slug' => 'lenovo',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $productId = DB::table('products')->insertGetId([
        'category_id' => $categoryId,
        'brand_id' => $brandId,
        'name' => 'IdeaPad Slim 5',
        'slug' => 'ideapad-slim-5',
        'summary' => 'Lightweight 14-inch productivity laptop',
        'description' => 'Full product description for testing defaults.',
        'price' => '64999.00',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $imageId = DB::table('product_images')->insertGetId([
        'product_id' => $productId,
        'path' => 'products/ideapad-slim-5/front.webp',
        'alt_text' => 'IdeaPad Slim 5 front view',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $category = DB::table('categories')->where('id', $categoryId)->first();
    $product = DB::table('products')->where('id', $productId)->first();
    $image = DB::table('product_images')->where('id', $imageId)->first();

    expect($category)->not->toBeNull()
        ->and((int) $category?->sort_order)->toBe(0)
        ->and((bool) $category?->is_active)->toBeTrue();

    expect($product)->not->toBeNull()
        ->and($product?->currency)->toBe('INR')
        ->and($product?->availability)->toBe(ProductAvailability::InStock->value)
        ->and((float) $product?->rating_avg)->toBe(0.0)
        ->and((int) $product?->rating_count)->toBe(0)
        ->and($product?->value_score)->toBeNull()
        ->and((bool) $product?->is_published)->toBeTrue()
        ->and($product?->deleted_at)->toBeNull();

    expect($image)->not->toBeNull()
        ->and((int) $image?->sort_order)->toBe(0)
        ->and((bool) $image?->is_primary)->toBeFalse();
});

test('catalog tables enforce unique slugs and foreign key delete behaviours', function (): void {
    $now = now();

    $parentId = DB::table('categories')->insertGetId([
        'name' => 'Computers',
        'slug' => 'computers',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $childId = DB::table('categories')->insertGetId([
        'parent_id' => $parentId,
        'name' => 'Laptops',
        'slug' => 'laptops',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $brandId = DB::table('brands')->insertGetId([
        'name' => 'Asus',
        'slug' => 'asus',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $productId = DB::table('products')->insertGetId([
        'category_id' => $childId,
        'brand_id' => $brandId,
        'name' => 'Zenbook 14',
        'slug' => 'zenbook-14',
        'summary' => 'OLED ultrabook',
        'description' => 'Detailed Zenbook description.',
        'price' => '89999.00',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $imageId = DB::table('product_images')->insertGetId([
        'product_id' => $productId,
        'path' => 'products/zenbook-14/main.webp',
        'alt_text' => 'Zenbook 14 lid open',
        'is_primary' => true,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    expect(fn () => DB::transaction(static fn () => DB::table('categories')->insert([
        'name' => 'Duplicate Laptops',
        'slug' => 'laptops',
        'created_at' => $now,
        'updated_at' => $now,
    ])))->toThrow(QueryException::class);

    expect(fn () => DB::transaction(static fn () => DB::table('brands')->insert([
        'name' => 'Duplicate Asus',
        'slug' => 'asus',
        'created_at' => $now,
        'updated_at' => $now,
    ])))->toThrow(QueryException::class);

    expect(fn () => DB::transaction(static fn () => DB::table('products')->insert([
        'category_id' => $childId,
        'brand_id' => $brandId,
        'name' => 'Duplicate Zenbook',
        'slug' => 'zenbook-14',
        'summary' => 'Duplicate',
        'description' => 'Duplicate',
        'price' => '79999.00',
        'created_at' => $now,
        'updated_at' => $now,
    ])))->toThrow(QueryException::class);

    // Deleting parent category sets child.parent_id to null (nullOnDelete).
    DB::table('categories')->where('id', $parentId)->delete();
    expect(DB::table('categories')->where('id', $childId)->value('parent_id'))->toBeNull();

    // Categories and brands with products cannot be deleted (restrictOnDelete).
    expect(fn () => DB::transaction(static fn () => DB::table('categories')->where('id', $childId)->delete()))
        ->toThrow(QueryException::class);
    expect(fn () => DB::transaction(static fn () => DB::table('brands')->where('id', $brandId)->delete()))
        ->toThrow(QueryException::class);

    // Deleting a product cascades to product_images (cascadeOnDelete), then category/brand can be deleted.
    DB::table('products')->where('id', $productId)->delete();
    expect(DB::table('product_images')->where('id', $imageId)->exists())->toBeFalse();

    expect(DB::table('categories')->where('id', $childId)->delete())->toBe(1)
        ->and(DB::table('brands')->where('id', $brandId)->delete())->toBe(1);
});

test('catalog migrations roll back and re-apply cleanly', function (): void {
    $migrationFiles = [
        database_path('migrations/2026_11_11_150020_create_categories_table.php'),
        database_path('migrations/2026_11_11_150021_create_brands_table.php'),
        database_path('migrations/2026_11_11_150022_create_products_table.php'),
        database_path('migrations/2026_11_11_150023_create_product_images_table.php'),
    ];

    /** @var list<Migration> $migrations */
    $migrations = array_map(
        static fn (string $path): Migration => require $path,
        $migrationFiles,
    );

    foreach (array_reverse($migrations) as $migration) {
        $migration->down();
    }

    expect(Schema::hasTable('product_images'))->toBeFalse()
        ->and(Schema::hasTable('products'))->toBeFalse()
        ->and(Schema::hasTable('brands'))->toBeFalse()
        ->and(Schema::hasTable('categories'))->toBeFalse();

    foreach ($migrations as $migration) {
        $migration->up();
    }

    expect(Schema::hasTable('categories'))->toBeTrue()
        ->and(Schema::hasTable('brands'))->toBeTrue()
        ->and(Schema::hasTable('products'))->toBeTrue()
        ->and(Schema::hasTable('product_images'))->toBeTrue();
});
