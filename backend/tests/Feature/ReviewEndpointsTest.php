<?php

declare(strict_types=1);

use App\Enums\ReviewStatus;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;

uses(RefreshDatabase::class);

function reviewFor(Product $product, array $attributes = []): Review
{
    return Review::create([
        'product_id' => $product->id,
        'rating' => 4,
        'title' => 'Worth considering',
        'body' => 'This product has worked well for my everyday needs.',
        ...$attributes,
    ]);
}

test('review listing paginates approved reviews and only exposes the signed in users pending review', function (): void {
    $product = Product::factory()->create(['slug' => 'reviewable-product']);
    $owner = User::factory()->create();
    $approved = reviewFor($product, ['rating' => 5, 'title' => 'Excellent choice']);
    $approved->forceFill(['status' => ReviewStatus::Approved])->save();
    $ownPending = reviewFor($product, ['user_id' => $owner->id, 'rating' => 3]);
    reviewFor($product, ['user_id' => User::factory()->create()->id, 'rating' => 1]);

    $this->actingAs($owner)->getJson('/api/v1/products/reviewable-product/reviews?per_page=1')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $ownPending->id)
        ->assertJsonPath('data.0.status', 'pending')
        ->assertJsonPath('meta.rating_distribution.5', 1)
        ->assertJsonPath('meta.rating_distribution.1', 0)
        ->assertJsonPath('meta.own_pending_review.id', $ownPending->id);

    $this->getJson('/api/v1/products/reviewable-product/reviews')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $approved->id)
        ->assertJsonPath('meta.own_pending_review', null);
});

test('customers can create one validated pending review and duplicates receive a clear error', function (): void {
    $product = Product::factory()->create(['slug' => 'reviewable-product']);
    $customer = User::factory()->create();

    $this->postJson('/api/v1/products/reviewable-product/reviews', [
        'rating' => 5,
        'title' => 'Great purchase',
        'body' => 'The product has been reliable and easy to use.',
    ])->assertUnauthorized();

    $this->actingAs($customer)->postJson('/api/v1/products/reviewable-product/reviews', [
        'rating' => 5,
        'title' => 'Great purchase',
        'body' => 'The product has been reliable and easy to use.',
    ])->assertCreated()->assertJsonPath('data.status', 'pending');

    $this->postJson('/api/v1/products/reviewable-product/reviews', [
        'rating' => 5,
        'title' => 'Great purchase',
        'body' => 'The product has been reliable and easy to use.',
    ])->assertUnprocessable()->assertJsonPath('error.details.review.0', 'You have already reviewed this product.');

    $this->postJson('/api/v1/products/reviewable-product/reviews', [
        'rating' => 6,
        'title' => 'x',
        'body' => 'short',
    ])->assertUnprocessable()->assertJsonValidationErrors(['rating', 'title', 'body']);
});

test('review owners can edit and delete while other users receive forbidden', function (): void {
    $product = Product::factory()->create();
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $review = reviewFor($product, ['user_id' => $owner->id]);

    $this->actingAs($other)->patchJson('/api/v1/reviews/'.$review->id, [
        'rating' => 2,
        'title' => 'Updated title',
        'body' => 'This is a sufficiently detailed updated review.',
    ])->assertForbidden();

    $this->actingAs($owner)->patchJson('/api/v1/reviews/'.$review->id, [
        'rating' => 2,
        'title' => 'Updated title',
        'body' => 'This is a sufficiently detailed updated review.',
    ])->assertOk()->assertJsonPath('data.status', 'pending');

    $this->deleteJson('/api/v1/reviews/'.$review->id)->assertNoContent();
    expect(Review::query()->find($review->id))->toBeNull();
});

test('editing or deleting an approved review removes it from product aggregates', function (): void {
    $product = Product::factory()->withRating(4.0, 2)->create();
    $owner = User::factory()->create();
    $approved = reviewFor($product, ['user_id' => $owner->id, 'rating' => 5]);
    $approved->forceFill(['status' => ReviewStatus::Approved])->save();
    $other = reviewFor($product, ['rating' => 3]);
    $other->forceFill(['status' => ReviewStatus::Approved])->save();

    $this->actingAs($owner)->patchJson('/api/v1/reviews/'.$approved->id, [
        'rating' => 1,
        'title' => 'Changed after use',
        'body' => 'The revised review returns to moderation before it is shown.',
    ])->assertOk();
    expect($product->fresh()->rating_count)->toBe(1)
        ->and($product->fresh()->rating_avg)->toBe(3.0);

    $this->actingAs($owner)->deleteJson('/api/v1/reviews/'.$approved->id)->assertNoContent();
    expect($product->fresh()->rating_count)->toBe(1);
});

test('review creation is limited to five requests per user per hour', function (): void {
    $product = Product::factory()->create(['slug' => 'reviewable-product']);
    $customer = User::factory()->create();
    RateLimiter::clear('review-create:'.$customer->id);

    for ($attempt = 0; $attempt < 5; $attempt++) {
        $response = $this->actingAs($customer)->postJson('/api/v1/products/reviewable-product/reviews', [
            'rating' => 4,
            'title' => 'Valid title',
            'body' => 'A valid review for rate limit coverage.',
        ]);
        $response->assertStatus($attempt === 0 ? 201 : 422);
    }

    $this->actingAs($customer)->postJson('/api/v1/products/reviewable-product/reviews', [
        'rating' => 4,
        'title' => 'Valid title',
        'body' => 'A valid review for rate limit coverage.',
    ])->assertTooManyRequests();
});
