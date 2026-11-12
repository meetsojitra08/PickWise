<?php

declare(strict_types=1);

use App\Models\Brand;
use App\Models\Category;
use App\Models\PriceHistory;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('price history endpoint returns chronological money points for a visible product', function (): void {
    $category = Category::factory()->create();
    $brand = Brand::factory()->create();
    $product = Product::factory()->for($category)->for($brand)->create([
        'slug' => 'history-laptop',
        'currency' => 'INR',
    ]);
    PriceHistory::factory()->for($product)->recordedOn('2026-09-01')->create(['price' => '92000.00']);
    PriceHistory::factory()->for($product)->recordedOn('2026-07-01')->create(['price' => '99999.00']);
    PriceHistory::factory()->for($product)->recordedOn('2026-09-01')->create(['price' => '90000.00']);

    $this->getJson('/api/v1/products/history-laptop/price-history')
        ->assertOk()
        ->assertJsonPath('data.currency', 'INR')
        ->assertJsonPath('data.points.0.recorded_at', '2026-07-01')
        ->assertJsonPath('data.points.0.price.amount', '99999.00')
        ->assertJsonPath('data.points.0.price.currency', 'INR')
        ->assertJsonPath('data.points.1.recorded_at', '2026-09-01')
        ->assertJsonPath('data.points.2.price.amount', '90000.00');
});

test('price history endpoint returns an empty series and hides unavailable products', function (): void {
    $category = Category::factory()->create();
    $brand = Brand::factory()->create();
    Product::factory()->for($category)->for($brand)->create(['slug' => 'new-laptop']);
    Product::factory()->unpublished()->for($category)->for($brand)->create(['slug' => 'hidden-laptop']);

    $this->getJson('/api/v1/products/new-laptop/price-history')
        ->assertOk()
        ->assertJsonPath('data.currency', 'INR')
        ->assertJsonPath('data.points', []);

    $this->getJson('/api/v1/products/unknown-laptop/price-history')->assertNotFound();
    $this->getJson('/api/v1/products/hidden-laptop/price-history')->assertNotFound();
});
