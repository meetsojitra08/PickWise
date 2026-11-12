<?php

declare(strict_types=1);

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductSpec;
use App\Models\SpecDefinition;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('similar products ranks same-category matches by comparable specs and price', function (): void {
    $category = Category::factory()->create(['slug' => 'laptops']);
    $otherCategory = Category::factory()->create(['slug' => 'tablets']);
    $brand = Brand::factory()->create();
    $memory = SpecDefinition::factory()->for($category)->numeric('GB')->comparable()->create([
        'key' => 'memory',
        'is_comparable' => true,
    ]);
    $source = Product::factory()->for($category)->for($brand)->create([
        'slug' => 'source-laptop',
        'price' => '1000.00',
    ]);
    ProductSpec::factory()->for($source)->for($memory)->numericValue(16)->create();

    $bestMatch = Product::factory()->for($category)->for($brand)->create([
        'slug' => 'best-match',
        'price' => '1020.00',
    ]);
    ProductSpec::factory()->for($bestMatch)->for($memory)->numericValue(16)->create();

    $weakerMatch = Product::factory()->for($category)->for($brand)->create([
        'slug' => 'weaker-match',
        'price' => '1100.00',
    ]);
    ProductSpec::factory()->for($weakerMatch)->for($memory)->numericValue(12)->create();

    $tooExpensive = Product::factory()->for($category)->for($brand)->create([
        'slug' => 'too-expensive',
        'price' => '1600.00',
    ]);
    ProductSpec::factory()->for($tooExpensive)->for($memory)->numericValue(16)->create();

    $wrongCategory = Product::factory()->for($otherCategory)->for($brand)->create([
        'slug' => 'wrong-category',
        'price' => '1000.00',
    ]);
    ProductSpec::factory()->for($wrongCategory)->for($memory)->numericValue(16)->create();

    $this->getJson('/api/v1/products/source-laptop/similar')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.slug', 'best-match')
        ->assertJsonPath('data.1.slug', 'weaker-match');
});

test('similar products returns an empty list when no comparable matches exist and hides unavailable sources', function (): void {
    $category = Category::factory()->create(['slug' => 'laptops']);
    $brand = Brand::factory()->create();
    $memory = SpecDefinition::factory()->for($category)->numeric('GB')->comparable()->create([
        'key' => 'memory',
        'is_comparable' => true,
    ]);
    $source = Product::factory()->for($category)->for($brand)->create(['slug' => 'source-laptop']);
    ProductSpec::factory()->for($source)->for($memory)->numericValue(16)->create();
    Product::factory()->unpublished()->for($category)->for($brand)->create(['slug' => 'hidden-laptop']);

    $this->getJson('/api/v1/products/source-laptop/similar')
        ->assertOk()
        ->assertJsonPath('data', []);

    $this->getJson('/api/v1/products/hidden-laptop/similar')->assertNotFound();
    $this->getJson('/api/v1/products/unknown-laptop/similar')->assertNotFound();
});
