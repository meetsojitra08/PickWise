<?php

declare(strict_types=1);

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\SpecDefinition;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('category filters endpoint caches facets under pickwise:catalog:facets:{slug} and avoids queries on cache hit', function (): void {
    $category = Category::factory()->create([
        'name' => 'Laptops',
        'slug' => 'laptops',
    ]);
    $brand = Brand::factory()->create(['name' => 'Apple', 'slug' => 'apple']);

    SpecDefinition::factory()->for($category)->numeric('GB', true)->filterable()->create([
        'key' => 'ram_gb',
        'label' => 'RAM',
    ]);

    Product::factory()->for($category)->for($brand)->create([
        'price' => '89900.00',
    ]);

    $cacheKey = 'pickwise:catalog:facets:laptops';
    expect(Cache::has($cacheKey))->toBeFalse();

    // First request: computes facets and stores in cache.
    $firstResponse = $this->getJson('/api/v1/categories/laptops/filters')
        ->assertOk()
        ->assertHeader('X-Request-Id');

    expect(Cache::has($cacheKey))->toBeTrue();

    // Second request: served entirely from cache with 0 database queries.
    DB::flushQueryLog();
    DB::enableQueryLog();

    try {
        $secondResponse = $this->getJson('/api/v1/categories/laptops/filters')
            ->assertOk();

        expect(count(DB::getQueryLog()))->toBe(0)
            ->and($secondResponse->json('data.category.id'))->toBe($firstResponse->json('data.category.id'))
            ->and($secondResponse->json('data.price_range.min.amount'))->toBe('89900.00');
    } finally {
        DB::disableQueryLog();
    }
});

test('product changes invalidate the related category facet cache', function (): void {
    $category = Category::factory()->create(['slug' => 'smartphones']);
    $brand = Brand::factory()->create();

    $product = Product::factory()->for($category)->for($brand)->create(['price' => '49999.00']);

    $this->getJson('/api/v1/categories/smartphones/filters')->assertOk();
    expect(Cache::has('pickwise:catalog:facets:smartphones'))->toBeTrue();

    // Updating product price must invalidate facet cache.
    $product->update(['price' => '44999.00']);
    expect(Cache::has('pickwise:catalog:facets:smartphones'))->toBeFalse();

    // Refetch to warm cache again.
    $this->getJson('/api/v1/categories/smartphones/filters')->assertOk();
    expect(Cache::has('pickwise:catalog:facets:smartphones'))->toBeTrue();

    // Deleting the product must invalidate facet cache.
    $product->delete();
    expect(Cache::has('pickwise:catalog:facets:smartphones'))->toBeFalse();
});

test('moving a product to another category invalidates both old and new category facet caches', function (): void {
    $catA = Category::factory()->create(['slug' => 'tablets']);
    $catB = Category::factory()->create(['slug' => 'e-readers']);
    $brand = Brand::factory()->create();

    $product = Product::factory()->for($catA)->for($brand)->create();

    $this->getJson('/api/v1/categories/tablets/filters')->assertOk();
    $this->getJson('/api/v1/categories/e-readers/filters')->assertOk();

    expect(Cache::has('pickwise:catalog:facets:tablets'))->toBeTrue()
        ->and(Cache::has('pickwise:catalog:facets:e-readers'))->toBeTrue();

    $product->update(['category_id' => $catB->id]);

    expect(Cache::has('pickwise:catalog:facets:tablets'))->toBeFalse()
        ->and(Cache::has('pickwise:catalog:facets:e-readers'))->toBeFalse();
});

test('spec definition mutations invalidate the related category facet cache', function (): void {
    $category = Category::factory()->create(['slug' => 'monitors']);

    $spec = SpecDefinition::factory()->for($category)->numeric('Hz', true)->filterable()->create([
        'key' => 'refresh_rate',
        'label' => 'Refresh Rate',
    ]);

    $this->getJson('/api/v1/categories/monitors/filters')->assertOk();
    expect(Cache::has('pickwise:catalog:facets:monitors'))->toBeTrue();

    $spec->update(['label' => 'Display Refresh Rate']);
    expect(Cache::has('pickwise:catalog:facets:monitors'))->toBeFalse();

    $this->getJson('/api/v1/categories/monitors/filters')->assertOk();
    expect(Cache::has('pickwise:catalog:facets:monitors'))->toBeTrue();

    $spec->delete();
    expect(Cache::has('pickwise:catalog:facets:monitors'))->toBeFalse();
});

test('category mutations invalidate facet caches', function (): void {
    $category = Category::factory()->create(['slug' => 'audio']);

    $this->getJson('/api/v1/categories/audio/filters')->assertOk();
    expect(Cache::has('pickwise:catalog:facets:audio'))->toBeTrue();

    $category->update(['name' => 'Audio & Sound']);
    expect(Cache::has('pickwise:catalog:facets:audio'))->toBeFalse();
});

test('admin bulk status update invalidates facet cache for affected categories', function (): void {
    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create(['slug' => 'wearables']);
    $brand = Brand::factory()->create();

    $products = Product::factory()->count(2)->for($category)->for($brand)->create(['is_published' => true]);

    $this->getJson('/api/v1/categories/wearables/filters')->assertOk();
    expect(Cache::has('pickwise:catalog:facets:wearables'))->toBeTrue();

    $this->actingAs($admin)
        ->patchJson('/api/v1/admin/products/bulk-status', [
            'product_ids' => $products->pluck('id')->all(),
            'is_published' => false,
        ])
        ->assertOk();

    expect(Cache::has('pickwise:catalog:facets:wearables'))->toBeFalse();
});

test('unknown or inactive category requests do not cache not found responses', function (): void {
    $this->getJson('/api/v1/categories/non-existent-cat/filters')
        ->assertNotFound();

    expect(Cache::has('pickwise:catalog:facets:non-existent-cat'))->toBeFalse();
});
