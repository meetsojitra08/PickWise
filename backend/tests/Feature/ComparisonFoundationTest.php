<?php

declare(strict_types=1);

use App\Models\Comparison;
use App\Models\ComparisonItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('comparison tables store owner, share token, verdict, and ordered items', function (): void {
    expect(Schema::hasColumns('comparisons', [
        'id',
        'user_id',
        'name',
        'ai_verdict',
        'share_token',
        'created_at',
        'updated_at',
    ]))->toBeTrue()
        ->and(Schema::hasColumns('comparison_items', [
            'id',
            'comparison_id',
            'product_id',
            'position',
        ]))->toBeTrue();

    $user = User::factory()->create();
    $products = Product::factory()->count(3)->create();

    $comparison = Comparison::factory()->for($user)->shared()->create([
        'name' => 'Laptops for editing',
        'ai_verdict' => ['summary' => 'Choose the MacBook.'],
    ]);

    foreach ($products as $index => $product) {
        ComparisonItem::factory()->for($comparison)->for($product)->create([
            'position' => $index + 1,
        ]);
    }

    $comparison->refresh();

    expect($comparison->user->is($user))->toBeTrue()
        ->and($comparison->ai_verdict)->toBe(['summary' => 'Choose the MacBook.'])
        ->and($comparison->isShared())->toBeTrue()
        ->and(strlen((string) $comparison->share_token))->toBe(32)
        ->and($comparison->items->pluck('product_id')->all())->toBe($products->pluck('id')->all())
        ->and($comparison->items->pluck('position')->all())->toBe([1, 2, 3])
        ->and($user->comparisons()->count())->toBe(1)
        ->and($products[0]->comparisonItems()->count())->toBe(1);
});

test('a comparison item does not carry its own timestamps', function (): void {
    $item = ComparisonItem::factory()->create();

    expect($item->usesTimestamps())->toBeFalse()
        ->and($item->comparison)->toBeInstanceOf(Comparison::class)
        ->and($item->product)->toBeInstanceOf(Product::class);
});
