<?php

declare(strict_types=1);

use App\Enums\ReviewStatus;
use App\Models\Product;
use App\Models\Review;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('database seeder creates deterministic mixed sentiment showcase reviews and approved aggregates', function (): void {
    Storage::fake('public');

    $this->seed(DatabaseSeeder::class);

    expect(Product::query()->count())->toBe(60)
        ->and(Review::query()->count())->toBe(360)
        ->and(Review::query()->whereNull('user_id')->count())->toBe(360)
        ->and(Review::query()->where('status', ReviewStatus::Approved)->count())->toBe(360)
        ->and(Review::query()->where('rating', 1)->count())->toBe(0)
        ->and(Review::query()->where('rating', 2)->count())->toBe(60)
        ->and(Review::query()->where('rating', 3)->count())->toBe(60)
        ->and(Review::query()->where('rating', 4)->count())->toBe(120)
        ->and(Review::query()->where('rating', 5)->count())->toBe(120);

    foreach (Product::query()->with('reviews')->get() as $product) {
        $ratings = $product->reviews->pluck('rating');

        expect($product->reviews)->toHaveCount(6)
            ->and($product->reviews->every(static fn (Review $review): bool => $review->user_id === null
                && $review->author_name !== null
                && $review->status === ReviewStatus::Approved))->toBeTrue()
            ->and($product->rating_count)->toBe(6)
            ->and($product->rating_avg)->toBe(round((float) $ratings->avg(), 2));
    }

    $firstReviewIds = Review::query()->orderBy('id')->pluck('id')->all();
    $this->seed(DatabaseSeeder::class);

    expect(Review::query()->count())->toBe(360)
        ->and(Review::query()->orderBy('id')->pluck('id')->all())->toBe($firstReviewIds);
});
