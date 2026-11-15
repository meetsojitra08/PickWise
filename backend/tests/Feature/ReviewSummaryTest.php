<?php

declare(strict_types=1);

use App\Enums\AiFailureReason;
use App\Enums\AiFeature;
use App\Enums\AiUsageStatus;
use App\Enums\ReviewSentiment;
use App\Enums\ReviewStatus;
use App\Exceptions\AiUnavailableException;
use App\Jobs\GenerateReviewSummary;
use App\Models\AiUsageLog;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Review;
use App\Models\ReviewSummary;
use App\Services\ReviewSummaryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

function reviewSummaryReview(Product $product, array $attributes = []): Review
{
    return Review::create([
        'product_id' => $product->id,
        'rating' => 4,
        'title' => 'Solid everyday choice',
        'body' => 'It has been reliable for daily use and still feels well made.',
        ...$attributes,
    ]);
}

function approveReviewSummaryReview(Review $review): Review
{
    $review->forceFill(['status' => ReviewStatus::Approved])->save();

    return $review;
}

function storedReviewSummary(Product $product, string $summary = 'Customers like the value.'): ReviewSummary
{
    return ReviewSummary::create([
        'product_id' => $product->id,
        'summary' => $summary,
        'pros' => ['Good battery'],
        'cons' => ['Average speakers'],
        'sentiment' => ReviewSentiment::Mixed,
        'reviews_count' => 3,
        'generated_at' => now(),
    ]);
}

test('review summaries table stores one typed row per product', function (): void {
    expect(Schema::hasTable('review_summaries'))->toBeTrue()
        ->and(Schema::hasColumns('review_summaries', [
            'id', 'product_id', 'summary', 'pros', 'cons', 'sentiment', 'reviews_count', 'generated_at',
        ]))->toBeTrue();

    $product = Product::factory()->create();
    $summary = storedReviewSummary($product);

    expect($summary->sentiment)->toBe(ReviewSentiment::Mixed)
        ->and($summary->pros)->toBe(['Good battery'])
        ->and($summary->cons)->toBe(['Average speakers'])
        ->and($summary->reviews_count)->toBe(3)
        ->and($product->reviewSummary()->first()?->is($summary))->toBeTrue();
});

test('the observer queues summary work only when the approved review set changes', function (): void {
    Queue::fake();

    $product = Product::factory()->create();
    $review = reviewSummaryReview($product);

    Queue::assertNothingPushed();

    approveReviewSummaryReview($review);
    Queue::assertPushed(
        GenerateReviewSummary::class,
        fn (GenerateReviewSummary $job): bool => $job->productId === $product->id,
    );

    Queue::fake();
    $review->forceFill(['status' => ReviewStatus::Pending])->save();
    Queue::assertPushed(GenerateReviewSummary::class);

    Queue::fake();
    $review->forceFill(['status' => ReviewStatus::Rejected])->save();
    Queue::assertNothingPushed();

    Queue::fake();
    approveReviewSummaryReview($review);
    Queue::fake();
    $review->delete();
    Queue::assertPushed(GenerateReviewSummary::class);
});

test('a product with fewer than three approved reviews has no summary and never calls the AI', function (): void {
    Queue::fake();

    $fake = fakeGroqClient();
    $product = Product::factory()->create();

    approveReviewSummaryReview(reviewSummaryReview($product));
    approveReviewSummaryReview(reviewSummaryReview($product));
    storedReviewSummary($product);

    $result = app(ReviewSummaryService::class)->generate($product);

    expect($result)->toBeNull()
        ->and(ReviewSummary::query()->where('product_id', $product->id)->exists())->toBeFalse()
        ->and($fake->calls())->toBe([]);
});

test('the summary stores only recent approved reviews and sanitises the reply', function (): void {
    Queue::fake();

    config()->set('ai.groq.model', 'test-model');
    $fake = fakeGroqClient();
    $product = Product::factory()->create(['name' => 'Aurora 14 Laptop']);

    for ($index = 1; $index <= 5; $index++) {
        approveReviewSummaryReview(reviewSummaryReview($product, [
            'title' => 'Approved title '.$index,
            'body' => 'Approved body '.$index.' with useful detail.',
            'author_name' => 'Maya Shah',
        ]));
    }

    approveReviewSummaryReview(reviewSummaryReview($product, [
        'title' => 'Very long review',
        'body' => str_repeat('x', 800),
    ]));
    reviewSummaryReview($product, [
        'title' => 'Pending secret title',
        'body' => 'This pending review must not reach the prompt.',
    ]);

    $fake->willReturn([
        'summary' => 'Reviewers like the battery and everyday comfort, but find the speakers average.',
        'pros' => ['Good battery', 'Comfortable keyboard', 'Quiet fans', 'Bright screen', 'Light body', 'Fast charging', 'Extra port'],
        'cons' => ['Average speakers', 'Limited upgrade options'],
        'sentiment' => 'positive',
    ]);

    $summary = app(ReviewSummaryService::class)->generate($product);

    expect($summary)->not->toBeNull()
        ->and($summary?->summary)->toBe('Reviewers like the battery and everyday comfort, but find the speakers average.')
        ->and($summary?->pros)->toHaveCount(6)
        ->and($summary?->cons)->toBe(['Average speakers', 'Limited upgrade options'])
        ->and($summary?->sentiment)->toBe(ReviewSentiment::Positive)
        ->and($summary?->reviews_count)->toBe(6)
        ->and($summary?->generated_at)->not->toBeNull();

    $prompt = $fake->lastUserPrompt();

    expect($prompt)
        ->toContain('Approved title 1')
        ->not->toContain('Pending secret title')
        ->not->toContain('Maya Shah')
        ->not->toContain(str_repeat('x', 600));

    $log = AiUsageLog::query()->sole();

    expect($log->feature)->toBe(AiFeature::ReviewSummary)
        ->and($log->status)->toBe(AiUsageStatus::Ok)
        ->and($log->model)->toBe('test-model')
        ->and($log->error_code)->toBeNull()
        ->and($log->user_id)->toBeNull();
});

test('an invalid reply keeps the previous summary and logs the failure', function (): void {
    Queue::fake();

    $product = Product::factory()->create();
    $fake = fakeGroqClient()->willReturn([
        'summary' => 'A new summary that should not be saved.',
        'pros' => ['Good battery'],
        'cons' => [],
        'sentiment' => 'glowing',
    ]);
    $existing = storedReviewSummary($product, 'The previous summary stays.');

    for ($index = 0; $index < 3; $index++) {
        approveReviewSummaryReview(reviewSummaryReview($product));
    }

    expect(fn () => app(ReviewSummaryService::class)->generate($product))
        ->toThrow(AiUnavailableException::class);

    expect($existing->refresh()->summary)->toBe('The previous summary stays.');

    $log = AiUsageLog::query()->sole();

    expect($log->feature)->toBe(AiFeature::ReviewSummary)
        ->and($log->status)->toBe(AiUsageStatus::Error)
        ->and($log->error_code)->toBe(AiFailureReason::InvalidJson->value);
});

test('a provider failure keeps the previous summary and logs the failure', function (): void {
    Queue::fake();

    $product = Product::factory()->create();
    $fake = fakeGroqClient()->willFail(AiFailureReason::Connection);
    $existing = storedReviewSummary($product, 'The previous summary stays.');

    for ($index = 0; $index < 3; $index++) {
        approveReviewSummaryReview(reviewSummaryReview($product));
    }

    expect(fn () => app(ReviewSummaryService::class)->generate($product))
        ->toThrow(AiUnavailableException::class);

    expect($existing->refresh()->summary)->toBe('The previous summary stays.')
        ->and($fake->calls())->toHaveCount(1);

    $log = AiUsageLog::query()->sole();

    expect($log->status)->toBe(AiUsageStatus::Error)
        ->and($log->error_code)->toBe(AiFailureReason::Connection->value);
});

test('approving the third review queues a job that saves the summary', function (): void {
    Queue::fake();

    config()->set('ai.groq.model', 'test-model');
    $product = Product::factory()->create();

    for ($index = 0; $index < 3; $index++) {
        approveReviewSummaryReview(reviewSummaryReview($product));
    }

    $queued = null;

    Queue::assertPushed(
        GenerateReviewSummary::class,
        function (GenerateReviewSummary $job) use (&$queued, $product): bool {
            if ($job->productId !== $product->id) {
                return false;
            }

            $queued = $job;

            return true;
        },
    );

    expect($queued)->not->toBeNull();

    $fake = fakeGroqClient()->willReturn([
        'summary' => 'Three customers agree that this is a reliable choice.',
        'pros' => ['Reliable'],
        'cons' => ['Few accessories'],
        'sentiment' => 'positive',
    ]);

    $queued?->handle(app(ReviewSummaryService::class));

    $summary = ReviewSummary::query()->where('product_id', $product->id)->first();

    expect($summary)->not->toBeNull()
        ->and($summary?->reviews_count)->toBe(3)
        ->and($summary?->sentiment)->toBe(ReviewSentiment::Positive)
        ->and($fake->calls())->toHaveCount(1);
});

test('product detail returns the saved summary without calling the AI', function (): void {
    $fake = fakeGroqClient();
    $category = Category::factory()->create();
    $brand = Brand::factory()->create();

    $product = Product::factory()->for($category)->for($brand)->create([
        'slug' => 'summarised-laptop',
    ]);
    $summary = storedReviewSummary($product, 'Customers value the battery life and comfortable keyboard.');

    $this->getJson('/api/v1/products/summarised-laptop')
        ->assertOk()
        ->assertJsonPath('data.review_summary.summary', 'Customers value the battery life and comfortable keyboard.')
        ->assertJsonPath('data.review_summary.pros', ['Good battery'])
        ->assertJsonPath('data.review_summary.cons', ['Average speakers'])
        ->assertJsonPath('data.review_summary.sentiment', 'mixed')
        ->assertJsonPath('data.review_summary.reviews_count', 3)
        ->assertJsonPath('data.review_summary.generated_at', $summary->generated_at?->toIso8601ZuluString());

    Product::factory()->for($category)->for($brand)->create([
        'slug' => 'summary-pending-product',
    ]);

    $this->getJson('/api/v1/products/summary-pending-product')
        ->assertOk()
        ->assertJsonPath('data.review_summary', null);

    expect($fake->calls())->toBe([]);
});
