<?php

declare(strict_types=1);

use App\Enums\ProductAvailability;
use App\Models\Product;
use App\Models\User;
use App\Models\WishlistItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;

uses(RefreshDatabase::class);

function savedWishlistItem(User $user, Product $product, ?DateTimeInterface $createdAt = null): WishlistItem
{
    $item = WishlistItem::create([
        'user_id' => $user->id,
        'product_id' => $product->id,
    ]);

    if ($createdAt !== null) {
        $item->forceFill(['created_at' => $createdAt])->save();
        $item->refresh();
    }

    return $item;
}

test('wishlist endpoints require an authenticated customer', function (): void {
    $this->getJson('/api/v1/wishlist')
        ->assertUnauthorized()
        ->assertJsonPath('error.code', 'unauthenticated');

    $this->postJson('/api/v1/wishlist', ['product_id' => 1])->assertUnauthorized();
    $this->deleteJson('/api/v1/wishlist/1')->assertUnauthorized();

    $admin = User::factory()->admin()->create();
    $product = Product::factory()->create();

    $this->actingAs($admin)->getJson('/api/v1/wishlist')->assertForbidden();
    $this->actingAs($admin)->postJson('/api/v1/wishlist', ['product_id' => $product->id])->assertForbidden();
    $this->actingAs($admin)->deleteJson('/api/v1/wishlist/'.$product->id)->assertForbidden();
});

test('adding a published product is idempotent and returns the saved product', function (): void {
    $customer = User::factory()->create();
    $product = Product::factory()->create([
        'price' => '49999.00',
        'availability' => ProductAvailability::LowStock,
    ]);

    $this->actingAs($customer)
        ->postJson('/api/v1/wishlist', ['product_id' => $product->id])
        ->assertCreated()
        ->assertJsonPath('data.product.id', $product->id)
        ->assertJsonPath('data.product.price.amount', '49999.00')
        ->assertJsonPath('data.product.price.currency', 'INR')
        ->assertJsonPath('data.product.availability', 'low_stock');

    $this->postJson('/api/v1/wishlist', ['product_id' => $product->id])
        ->assertOk()
        ->assertJsonPath('data.product.id', $product->id);

    expect(WishlistItem::query()->where('user_id', $customer->id)->count())->toBe(1);
});

test('unpublished, removed, and missing products cannot be added', function (): void {
    $customer = User::factory()->create();
    $unpublished = Product::factory()->unpublished()->create();
    $removed = Product::factory()->create();
    $removed->delete();

    $this->actingAs($customer)
        ->postJson('/api/v1/wishlist', ['product_id' => $unpublished->id])
        ->assertUnprocessable()
        ->assertJsonPath('error.details.product_id.0', 'This product is not available to save.');

    $this->postJson('/api/v1/wishlist', ['product_id' => $removed->id])
        ->assertUnprocessable()
        ->assertJsonPath('error.details.product_id.0', 'This product is not available to save.');

    $this->postJson('/api/v1/wishlist', ['product_id' => 999999])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('product_id', 'error.details');

    $this->postJson('/api/v1/wishlist', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('product_id', 'error.details');

    $this->postJson('/api/v1/wishlist', ['product_id' => 'not-a-number'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('product_id', 'error.details');

    expect(WishlistItem::query()->count())->toBe(0);
});

test('the wishlist lists only the owners published products newest first and paginates', function (): void {
    $owner = User::factory()->create();
    $otherCustomer = User::factory()->create();

    $newest = Product::factory()->create(['name' => 'Newest saved product', 'price' => '12999.00']);
    $older = Product::factory()->create(['name' => 'Older saved product']);
    $unpublished = Product::factory()->create();
    $removed = Product::factory()->create();

    savedWishlistItem($owner, $older, now()->subDay());
    savedWishlistItem($owner, $unpublished, now()->subHours(2));
    savedWishlistItem($owner, $removed, now()->subHour());
    savedWishlistItem($owner, $newest);
    savedWishlistItem($otherCustomer, Product::factory()->create());

    $unpublished->update(['is_published' => false]);
    $removed->delete();

    $this->actingAs($owner)
        ->getJson('/api/v1/wishlist')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.product.id', $newest->id)
        ->assertJsonPath('data.0.product.price.amount', '12999.00')
        ->assertJsonPath('data.1.product.id', $older->id)
        ->assertJsonPath('meta.total', 2)
        ->assertJsonPath('meta.per_page', 24)
        ->assertJsonPath('meta.current_page', 1);

    $this->getJson('/api/v1/wishlist?per_page=1')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('meta.last_page', 2);

    $this->getJson('/api/v1/wishlist?per_page=1&page=2')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.product.id', $older->id);

    $this->getJson('/api/v1/wishlist?per_page=49')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('per_page', 'error.details');
});

test('removing a product is idempotent and never touches another users wishlist', function (): void {
    $owner = User::factory()->create();
    $otherCustomer = User::factory()->create();
    $product = Product::factory()->create();

    $ownItem = savedWishlistItem($owner, $product);
    $otherItem = savedWishlistItem($otherCustomer, $product);

    $this->actingAs($owner)
        ->deleteJson('/api/v1/wishlist/'.$product->id)
        ->assertNoContent();

    expect(WishlistItem::query()->find($ownItem->id))->toBeNull()
        ->and(WishlistItem::query()->find($otherItem->id))->not->toBeNull();

    $this->actingAs($owner)
        ->deleteJson('/api/v1/wishlist/'.$product->id)
        ->assertNoContent();

    expect(WishlistItem::query()->where('user_id', $otherCustomer->id)->count())->toBe(1);
});

test('wishlist policy restricts access to active customers and item owners', function (): void {
    $customer = User::factory()->create();
    $otherCustomer = User::factory()->create();
    $admin = User::factory()->admin()->create();
    $inactiveCustomer = User::factory()->inactive()->create();
    $item = savedWishlistItem($customer, Product::factory()->create());

    expect(Gate::forUser($customer)->allows('viewAny', WishlistItem::class))->toBeTrue()
        ->and(Gate::forUser($customer)->allows('create', WishlistItem::class))->toBeTrue()
        ->and(Gate::forUser($customer)->allows('delete', $item))->toBeTrue()
        ->and(Gate::forUser($otherCustomer)->denies('delete', $item))->toBeTrue()
        ->and(Gate::forUser($admin)->denies('viewAny', WishlistItem::class))->toBeTrue()
        ->and(Gate::forUser($admin)->denies('create', WishlistItem::class))->toBeTrue()
        ->and(Gate::forUser($inactiveCustomer)->denies('viewAny', WishlistItem::class))->toBeTrue()
        ->and(Gate::forUser($inactiveCustomer)->denies('create', WishlistItem::class))->toBeTrue();
});
