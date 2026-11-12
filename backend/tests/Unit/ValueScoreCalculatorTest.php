<?php

declare(strict_types=1);

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductSpec;
use App\Models\SpecDefinition;
use App\Services\ValueScoreCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('calculates category-relative scores and applies the documented rating prior', function (): void {
    $category = Category::factory()->create();
    $memory = SpecDefinition::factory()->numeric('GB')->comparable(true)->create([
        'category_id' => $category->id,
        'key' => 'memory',
    ]);
    $premium = Product::factory()->for($category)->withRating(5, 5)->create([
        'price' => '100.00',
    ]);
    $basic = Product::factory()->for($category)->create([
        'price' => '100.00',
    ]);

    ProductSpec::factory()->for($premium)->for($memory, 'specDefinition')->numericValue(100)->create();
    ProductSpec::factory()->for($basic)->for($memory, 'specDefinition')->numericValue(50)->create();

    $scores = app(ValueScoreCalculator::class)->recalculateCategory($category->id);

    expect($scores)->toBe([$premium->id => 97, $basic->id => 24])
        ->and($premium->fresh()->value_score)->toBe(97)
        ->and($basic->fresh()->value_score)->toBe(24);
});

test('reverses lower-is-better specs and skips non-comparable values', function (): void {
    $category = Category::factory()->create();
    $weight = SpecDefinition::factory()->numeric('kg')->comparable(false)->create([
        'category_id' => $category->id,
        'key' => 'weight',
    ]);
    $text = SpecDefinition::factory()->text()->comparable()->create([
        'category_id' => $category->id,
        'key' => 'finish',
    ]);
    $products = Product::factory()->count(3)->for($category)->create(['price' => '100.00']);

    foreach ($products as $index => $product) {
        ProductSpec::factory()->for($product)->for($weight, 'specDefinition')->numericValue((float) $index + 1)->create();
        ProductSpec::factory()->for($product)->for($text, 'specDefinition')->textValue('matte')->create();
    }

    $scores = app(ValueScoreCalculator::class)->recalculateCategory($category->id);

    expect(array_values($scores))->toBe([94, 59, 24]);
});

test('gives tied spec and price percentiles the same midpoint score', function (): void {
    $category = Category::factory()->create();
    $capacity = SpecDefinition::factory()->numeric('GB')->comparable(true)->create([
        'category_id' => $category->id,
        'key' => 'capacity',
    ]);
    $products = Product::factory()->count(3)->for($category)->create(['price' => '100.00']);

    foreach ($products as $product) {
        ProductSpec::factory()->for($product)->for($capacity, 'specDefinition')->numericValue(128)->create();
    }

    $scores = app(ValueScoreCalculator::class)->recalculateCategory($category->id);

    expect(array_values($scores))->toBe([59, 59, 59]);
});

test('leaves products without usable numeric comparable specs unscored', function (): void {
    $category = Category::factory()->create();
    $product = Product::factory()->for($category)->withValueScore(75)->create();
    $unpublished = Product::factory()->for($category)->unpublished()->withValueScore(81)->create();

    $scores = app(ValueScoreCalculator::class)->recalculateCategory($category->id);

    expect($scores)->toBe([$product->id => null])
        ->and($product->fresh()->value_score)->toBeNull()
        ->and($unpublished->fresh()->value_score)->toBe(81);
});
