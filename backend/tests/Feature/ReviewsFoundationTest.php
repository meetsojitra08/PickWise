<?php

declare(strict_types=1);

use App\Enums\ReviewStatus;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Services\ProductRatingAggregator;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('reviews table has the documented columns and defaults', function (): void {
    expect(Schema::hasTable('reviews'))->toBeTrue()
        ->and(Schema::hasColumns('reviews', [
            'id', 'product_id', 'user_id', 'author_name', 'rating', 'title', 'body',
            'status', 'moderated_by', 'moderated_at', 'created_at', 'updated_at',
        ]))->toBeTrue();

    $product = Product::factory()->create();
    $review = Review::create([
        'product_id' => $product->id,
        'rating' => 5,
        'title' => 'A solid choice',
        'body' => 'The product worked exactly as I expected.',
    ]);

    expect($review->fresh()?->status)->toBe(ReviewStatus::Pending)
        ->and($review->rating)->toBe(5)
        ->and($review->product?->is($product))->toBeTrue();
});

test('a customer can have only one review per product while seeded reviews can omit the user', function (): void {
    $product = Product::factory()->create();
    $customer = User::factory()->create();
    $attributes = [
        'product_id' => $product->id,
        'user_id' => $customer->id,
        'rating' => 4,
        'title' => 'Good overall',
        'body' => 'The quality is good for the price.',
    ];

    Review::create($attributes);

    expect(fn () => Review::create($attributes))->toThrow(QueryException::class);

    $seeded = Review::create([
        ...$attributes,
        'user_id' => null,
        'author_name' => 'Showcase reviewer',
    ]);

    expect($seeded->user)->toBeNull()
        ->and($product->reviews)->toHaveCount(2)
        ->and($customer->reviews)->toHaveCount(1);
});

test('review policy restricts create and ownership actions to active customers', function (): void {
    $customer = User::factory()->create();
    $otherCustomer = User::factory()->create();
    $admin = User::factory()->admin()->create();
    $inactiveCustomer = User::factory()->inactive()->create();
    $review = Review::create([
        'product_id' => Product::factory()->create()->id,
        'user_id' => $customer->id,
        'rating' => 5,
        'title' => 'Excellent quality',
        'body' => 'This product has been excellent so far.',
    ]);

    expect(Gate::forUser($customer)->allows('create', Review::class))->toBeTrue()
        ->and(Gate::forUser($customer)->allows('update', $review))->toBeTrue()
        ->and(Gate::forUser($customer)->allows('delete', $review))->toBeTrue()
        ->and(Gate::forUser($otherCustomer)->denies('update', $review))->toBeTrue()
        ->and(Gate::forUser($admin)->denies('create', Review::class))->toBeTrue()
        ->and(Gate::forUser($inactiveCustomer)->denies('create', Review::class))->toBeTrue();
});

test('product rating aggregates include approved reviews only and reset when none remain', function (): void {
    $product = Product::factory()->withRating(1.5, 2)->create();
    $reviewData = [
        'product_id' => $product->id,
        'title' => 'Review title',
        'body' => 'A sufficiently long review body.',
    ];

    $approvedReview = Review::create([
        ...$reviewData,
        'rating' => 5,
    ]);
    $approvedReview->forceFill(['status' => ReviewStatus::Approved])->save();
    $secondApprovedReview = Review::create([
        ...$reviewData,
        'rating' => 1,
    ]);
    $secondApprovedReview->forceFill(['status' => ReviewStatus::Approved])->save();
    Review::create([
        ...$reviewData,
        'rating' => 1,
    ]);

    $aggregator = new ProductRatingAggregator;
    $aggregator->recalculate($product);
    $product->refresh();

    expect($product->rating_avg)->toBe(3.0)
        ->and($product->rating_count)->toBe(2);

    $approvedReview->delete();
    $aggregator->recalculate($product);
    $product->refresh();

    expect($product->rating_avg)->toBe(1.0)
        ->and($product->rating_count)->toBe(1);

    Review::query()->where('product_id', $product->id)->update(['status' => ReviewStatus::Pending->value]);
    $aggregator->recalculate($product);
    $product->refresh();

    expect($product->rating_avg)->toBe(0.0)
        ->and($product->rating_count)->toBe(0);
});
