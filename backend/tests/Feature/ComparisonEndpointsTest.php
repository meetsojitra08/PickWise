<?php

declare(strict_types=1);

use App\Models\Category;
use App\Models\Comparison;
use App\Models\ComparisonItem;
use App\Models\Product;
use App\Models\ProductSpec;
use App\Models\SpecDefinition;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;

uses(RefreshDatabase::class);

function savedComparisonFor(User $user, array $products, array $attributes = []): Comparison
{
    $comparison = Comparison::factory()->for($user)->create($attributes);

    foreach (array_values($products) as $index => $product) {
        ComparisonItem::factory()->for($comparison)->for($product)->create([
            'position' => $index + 1,
        ]);
    }

    return $comparison;
}

test('saved comparison endpoints require an authenticated customer', function (): void {
    $comparison = savedComparisonFor(User::factory()->create(), Product::factory()->count(2)->create()->all());

    $this->getJson('/api/v1/comparisons')->assertUnauthorized();
    $this->postJson('/api/v1/comparisons', [])->assertUnauthorized();
    $this->getJson('/api/v1/comparisons/'.$comparison->id)->assertUnauthorized();
    $this->patchJson('/api/v1/comparisons/'.$comparison->id, ['name' => 'New name'])->assertUnauthorized();
    $this->deleteJson('/api/v1/comparisons/'.$comparison->id)->assertUnauthorized();
    $this->postJson('/api/v1/comparisons/'.$comparison->id.'/share')->assertUnauthorized();
    $this->deleteJson('/api/v1/comparisons/'.$comparison->id.'/share')->assertUnauthorized();

    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->getJson('/api/v1/comparisons')->assertForbidden();
    $this->actingAs($admin)->getJson('/api/v1/comparisons/'.$comparison->id)->assertForbidden();
    $this->actingAs($admin)->postJson('/api/v1/comparisons/'.$comparison->id.'/share')->assertForbidden();
});

test('a customer can save an ordered comparison that returns its live matrix', function (): void {
    $customer = User::factory()->create();
    $category = Category::factory()->create(['name' => 'Laptops', 'slug' => 'laptops']);
    $alpha = Product::factory()->for($category)->create(['name' => 'Alpha 14', 'slug' => 'alpha-14']);
    $beta = Product::factory()->for($category)->create(['name' => 'Beta 15', 'slug' => 'beta-15']);
    $ram = SpecDefinition::factory()->for($category)->numeric('GB', true)->comparable()->create([
        'key' => 'ram_gb',
        'label' => 'RAM',
        'sort_order' => 1,
    ]);

    ProductSpec::factory()->for($alpha)->for($ram, 'specDefinition')->numericValue(16)->create();
    ProductSpec::factory()->for($beta)->for($ram, 'specDefinition')->numericValue(32)->create();

    $response = $this->actingAs($customer)->postJson('/api/v1/comparisons', [
        'name' => '  Editing shortlist  ',
        'product_ids' => [$beta->id, $alpha->id],
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Editing shortlist')
        ->assertJsonPath('data.share_token', null)
        ->assertJsonPath('data.is_shared', false)
        ->assertJsonPath('data.item_count', 2)
        ->assertJsonPath('data.unavailable_count', 0)
        ->assertJsonPath('data.items.0.id', $beta->id)
        ->assertJsonPath('data.items.1.id', $alpha->id)
        ->assertJsonPath('data.matrix.category.slug', 'laptops')
        ->assertJsonPath('data.matrix.products.0.id', $beta->id)
        ->assertJsonPath('data.matrix.products.1.id', $alpha->id)
        ->assertJsonPath('data.matrix.rows.0.key', 'ram_gb')
        ->assertJsonPath('data.matrix.rows.0.winner_product_id', $beta->id);

    $comparison = Comparison::query()->where('user_id', $customer->id)->firstOrFail();

    expect($comparison->items->pluck('product_id')->all())->toBe([$beta->id, $alpha->id])
        ->and($comparison->items->pluck('position')->all())->toBe([1, 2]);
});

test('saving a comparison validates name and two to four comparable published products', function (): void {
    $customer = User::factory()->create();
    $category = Category::factory()->create();
    $otherCategory = Category::factory()->create();
    $products = Product::factory()->count(5)->for($category)->create();
    $unpublished = Product::factory()->for($category)->unpublished()->create();
    $removed = Product::factory()->for($category)->create();
    $removed->delete();
    $crossCategory = Product::factory()->for($otherCategory)->create();

    $this->actingAs($customer)->postJson('/api/v1/comparisons', [
        'product_ids' => $products->take(2)->pluck('id')->all(),
    ])->assertUnprocessable()
        ->assertJsonPath('error.details.name.0', 'Give this comparison a name.');

    $this->postJson('/api/v1/comparisons', [
        'name' => '   ',
        'product_ids' => $products->take(2)->pluck('id')->all(),
    ])->assertUnprocessable()
        ->assertJsonPath('error.details.name.0', 'Give this comparison a name.');

    $this->postJson('/api/v1/comparisons', [
        'name' => str_repeat('a', 101),
        'product_ids' => $products->take(2)->pluck('id')->all(),
    ])->assertUnprocessable()
        ->assertJsonPath('error.details.name.0', 'Comparison names must be 100 characters or fewer.');

    $this->postJson('/api/v1/comparisons', [
        'name' => 'Too few',
        'product_ids' => [$products[0]->id],
    ])->assertUnprocessable()
        ->assertJsonPath('error.details.product_ids.0', 'Choose at least two products to save.');

    $this->postJson('/api/v1/comparisons', [
        'name' => 'Too many',
        'product_ids' => $products->pluck('id')->all(),
    ])->assertUnprocessable()
        ->assertJsonPath('error.details.product_ids.0', 'You can save up to four products in one comparison.');

    $this->postJson('/api/v1/comparisons', [
        'name' => 'Duplicate',
        'product_ids' => [$products[0]->id, $products[0]->id],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('product_ids.1', 'error.details');

    $this->postJson('/api/v1/comparisons', [
        'name' => 'Unpublished',
        'product_ids' => [$unpublished->id, $products[0]->id],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(
            ['product_ids.0' => 'This product is not available to compare.'],
            'error.details',
        );

    $this->postJson('/api/v1/comparisons', [
        'name' => 'Removed',
        'product_ids' => [$removed->id, $products[0]->id],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(
            ['product_ids.0' => 'This product is not available to compare.'],
            'error.details',
        );

    $this->postJson('/api/v1/comparisons', [
        'name' => 'Cross category',
        'product_ids' => [$crossCategory->id, $products[0]->id],
    ])->assertUnprocessable()
        ->assertJsonPath('error.details.product_ids.0', 'Products from different categories cannot be compared.');

    expect(Comparison::query()->count())->toBe(0);
});

test('the account list shows only the owners visible products newest first and paginates', function (): void {
    $owner = User::factory()->create();
    $otherCustomer = User::factory()->create();
    $category = Category::factory()->create(['name' => 'Laptops', 'slug' => 'laptops']);
    $products = Product::factory()->count(4)->for($category)->create();

    $older = savedComparisonFor($owner, $products->take(3)->all(), ['name' => 'Older comparison']);
    $hiddenProduct = $products[2];
    $hiddenProduct->update(['is_published' => false]);

    $newest = savedComparisonFor($owner, $products->take(2)->all(), ['name' => 'Newest comparison']);
    savedComparisonFor($otherCustomer, $products->take(2)->all(), ['name' => 'Someone else']);

    $this->actingAs($owner)
        ->getJson('/api/v1/comparisons')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.id', $newest->id)
        ->assertJsonPath('data.0.name', 'Newest comparison')
        ->assertJsonPath('data.0.item_count', 2)
        ->assertJsonPath('data.0.unavailable_count', 0)
        ->assertJsonPath('data.1.id', $older->id)
        ->assertJsonPath('data.1.item_count', 2)
        ->assertJsonPath('data.1.unavailable_count', 1)
        ->assertJsonPath('data.1.items.0.id', $products[0]->id)
        ->assertJsonPath('data.1.items.1.id', $products[1]->id)
        ->assertJsonPath('meta.total', 2)
        ->assertJsonPath('meta.per_page', 12);

    $this->getJson('/api/v1/comparisons?per_page=1')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('meta.last_page', 2);

    $this->getJson('/api/v1/comparisons?per_page=49')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('per_page', 'error.details');
});

test('the owner can read, rename, replace, and delete a saved comparison', function (): void {
    $owner = User::factory()->create();
    $otherCustomer = User::factory()->create();
    $category = Category::factory()->create();
    $products = Product::factory()->count(3)->for($category)->create();
    $comparison = savedComparisonFor($owner, $products->take(2)->all(), ['name' => 'Original name']);

    $this->actingAs($owner)
        ->getJson('/api/v1/comparisons/'.$comparison->id)
        ->assertOk()
        ->assertJsonPath('data.name', 'Original name')
        ->assertJsonPath('data.matrix.products.0.id', $products[0]->id);

    $this->actingAs($otherCustomer)
        ->getJson('/api/v1/comparisons/'.$comparison->id)
        ->assertForbidden();

    $this->actingAs($owner)
        ->patchJson('/api/v1/comparisons/'.$comparison->id, ['name' => '  Renamed comparison  '])
        ->assertOk()
        ->assertJsonPath('data.name', 'Renamed comparison')
        ->assertJsonPath('data.items.0.id', $products[0]->id)
        ->assertJsonPath('data.items.1.id', $products[1]->id);

    $this->actingAs($owner)
        ->patchJson('/api/v1/comparisons/'.$comparison->id, [
            'product_ids' => [$products[2]->id, $products[1]->id],
        ])
        ->assertOk()
        ->assertJsonPath('data.name', 'Renamed comparison')
        ->assertJsonPath('data.items.0.id', $products[2]->id)
        ->assertJsonPath('data.items.1.id', $products[1]->id)
        ->assertJsonPath('data.matrix.products.0.id', $products[2]->id);

    $this->actingAs($otherCustomer)
        ->patchJson('/api/v1/comparisons/'.$comparison->id, ['name' => 'Hijacked'])
        ->assertForbidden();

    $this->actingAs($otherCustomer)
        ->deleteJson('/api/v1/comparisons/'.$comparison->id)
        ->assertForbidden();

    $this->actingAs($owner)
        ->deleteJson('/api/v1/comparisons/'.$comparison->id)
        ->assertNoContent();

    expect(Comparison::query()->find($comparison->id))->toBeNull();
    $this->actingAs($owner)->getJson('/api/v1/comparisons/'.$comparison->id)->assertNotFound();
});

test('share tokens are stable, public read-only, and can be revoked by the owner', function (): void {
    $owner = User::factory()->create();
    $otherCustomer = User::factory()->create();
    $category = Category::factory()->create(['name' => 'Headphones', 'slug' => 'headphones']);
    $products = Product::factory()->count(2)->for($category)->create();
    $comparison = savedComparisonFor($owner, $products->all(), ['name' => 'Noise-cancelling picks']);

    $firstToken = $this->actingAs($owner)
        ->postJson('/api/v1/comparisons/'.$comparison->id.'/share')
        ->assertOk()
        ->json('data.share_token');

    expect($firstToken)->toBeString()
        ->and(strlen((string) $firstToken))->toBe(32);

    $secondToken = $this->actingAs($owner)
        ->postJson('/api/v1/comparisons/'.$comparison->id.'/share')
        ->assertOk()
        ->json('data.share_token');

    expect($secondToken)->toBe($firstToken);

    $this->getJson('/api/v1/shared/comparisons/'.$firstToken)
        ->assertOk()
        ->assertHeader('X-RateLimit-Limit', '120')
        ->assertJsonPath('data.name', 'Noise-cancelling picks')
        ->assertJsonPath('data.unavailable_count', 0)
        ->assertJsonPath('data.matrix.category.slug', 'headphones')
        ->assertJsonPath('data.matrix.products.0.id', $products[0]->id);

    $this->actingAs($otherCustomer)
        ->postJson('/api/v1/comparisons/'.$comparison->id.'/share')
        ->assertForbidden();

    $this->actingAs($otherCustomer)
        ->deleteJson('/api/v1/comparisons/'.$comparison->id.'/share')
        ->assertForbidden();

    $this->actingAs($owner)
        ->deleteJson('/api/v1/comparisons/'.$comparison->id.'/share')
        ->assertNoContent();

    $this->getJson('/api/v1/shared/comparisons/'.$firstToken)->assertNotFound();

    expect($comparison->refresh()->share_token)->toBeNull();
});

test('a shared comparison hides products that are no longer visible', function (): void {
    $owner = User::factory()->create();
    $category = Category::factory()->create();
    $products = Product::factory()->count(3)->for($category)->create();
    $comparison = savedComparisonFor($owner, $products->all(), [
        'name' => 'Older picks',
        'share_token' => str_repeat('a', 32),
    ]);

    $products[2]->update(['is_published' => false]);

    $this->getJson('/api/v1/shared/comparisons/'.str_repeat('a', 32))
        ->assertOk()
        ->assertJsonPath('data.unavailable_count', 1)
        ->assertJsonCount(2, 'data.matrix.products');

    $this->actingAs($owner)
        ->getJson('/api/v1/comparisons/'.$comparison->id)
        ->assertOk()
        ->assertJsonPath('data.item_count', 2)
        ->assertJsonPath('data.unavailable_count', 1)
        ->assertJsonCount(2, 'data.items');

    $products[0]->update(['is_published' => false]);

    $this->getJson('/api/v1/shared/comparisons/'.str_repeat('a', 32))
        ->assertOk()
        ->assertJsonPath('data.unavailable_count', 2)
        ->assertJsonPath('data.matrix', null);
});

test('comparison policy restricts saved comparisons to active customer owners', function (): void {
    $owner = User::factory()->create();
    $otherCustomer = User::factory()->create();
    $admin = User::factory()->admin()->create();
    $inactiveCustomer = User::factory()->inactive()->create();
    $comparison = savedComparisonFor($owner, Product::factory()->count(2)->create()->all());

    expect(Gate::forUser($owner)->allows('viewAny', Comparison::class))->toBeTrue()
        ->and(Gate::forUser($owner)->allows('create', Comparison::class))->toBeTrue()
        ->and(Gate::forUser($owner)->allows('view', $comparison))->toBeTrue()
        ->and(Gate::forUser($owner)->allows('update', $comparison))->toBeTrue()
        ->and(Gate::forUser($owner)->allows('delete', $comparison))->toBeTrue()
        ->and(Gate::forUser($owner)->allows('share', $comparison))->toBeTrue()
        ->and(Gate::forUser($otherCustomer)->denies('view', $comparison))->toBeTrue()
        ->and(Gate::forUser($otherCustomer)->denies('update', $comparison))->toBeTrue()
        ->and(Gate::forUser($otherCustomer)->denies('delete', $comparison))->toBeTrue()
        ->and(Gate::forUser($otherCustomer)->denies('share', $comparison))->toBeTrue()
        ->and(Gate::forUser($admin)->denies('viewAny', Comparison::class))->toBeTrue()
        ->and(Gate::forUser($admin)->denies('create', Comparison::class))->toBeTrue()
        ->and(Gate::forUser($inactiveCustomer)->denies('viewAny', Comparison::class))->toBeTrue()
        ->and(Gate::forUser($inactiveCustomer)->denies('create', Comparison::class))->toBeTrue();
});
