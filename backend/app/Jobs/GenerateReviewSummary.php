<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Product;
use App\Services\ReviewSummaryService;
use Illuminate\Contracts\Queue\ShouldBeUniqueUntilProcessing;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Regenerates one product's review summary after its approved reviews change.
 *
 * The job is unique per product while waiting, but a new run can be queued
 * once processing starts so a review approved mid-run is not lost. It is
 * dispatched after commit so the worker never reads a half-written review.
 */
final class GenerateReviewSummary implements ShouldBeUniqueUntilProcessing, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /**
     * Seconds to wait before each retry.
     *
     * @var list<int>
     */
    public array $backoff = [30, 120];

    public int $uniqueFor = 600;

    public function __construct(public readonly int $productId)
    {
        $this->afterCommit = true;
    }

    public function uniqueId(): string
    {
        return (string) $this->productId;
    }

    public function handle(ReviewSummaryService $summaries): void
    {
        $product = Product::query()->find($this->productId);

        if ($product === null) {
            return;
        }

        $summaries->generate($product);
    }
}
