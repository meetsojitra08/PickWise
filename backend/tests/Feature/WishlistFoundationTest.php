<?php

declare(strict_types=1);

use App\Models\Product;
use App\Models\User;
use App\Models\WishlistItem;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('wishlist_items table has documented columns, a unique product per user, and cascading deletes', function (): void {
    expect(Schema::hasColumns('wishlist_items', [
        'id', 'user_id', 'product_id', 'created_at', 'updated_at',
    ]))->toBeTrue()
        ->and(Schema::hasIndex('wishlist_items', ['user_id', 'product_id'], 'unique'))->toBeTrue()
        ->and(Schema::hasIndex('wishlist_items', ['product_id']))->toBeTrue();

    $customer = User::factory()->create();
    $product = Product::factory()->create();

    WishlistItem::create([
        'user_id' => $customer->id,
        'product_id' => $product->id,
    ]);

    expect(fn () => DB::transaction(static fn () => WishlistItem::create([
        'user_id' => $customer->id,
        'product_id' => $product->id,
    ])))->toThrow(QueryException::class);

    expect($customer->wishlistItems()->count())->toBe(1)
        ->and($product->wishlistItems()->count())->toBe(1);
});

test('deleting a user or a product removes its wishlist rows', function (): void {
    $customer = User::factory()->create();
    $product = Product::factory()->create();

    WishlistItem::create([
        'user_id' => $customer->id,
        'product_id' => $product->id,
    ]);

    $customer->delete();

    expect(WishlistItem::query()->count())->toBe(0);

    $secondCustomer = User::factory()->create();
    $secondProduct = Product::factory()->create();

    WishlistItem::create([
        'user_id' => $secondCustomer->id,
        'product_id' => $secondProduct->id,
    ]);

    $secondProduct->forceDelete();

    expect(WishlistItem::query()->count())->toBe(0);
});
