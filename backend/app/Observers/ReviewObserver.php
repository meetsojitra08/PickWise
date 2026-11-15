<?php

declare(strict_types=1);

namespace App\Observers;

use App\Enums\ReviewStatus;
use App\Jobs\GenerateReviewSummary;
use App\Models\Review;

/**
 * Queues a summary refresh whenever the set of approved reviews changes,
 * including direct model updates from moderation and future admin actions.
 */
final class ReviewObserver
{
    public function saved(Review $review): void
    {
        if (! $review->wasRecentlyCreated && ! $review->wasChanged('status')) {
            return;
        }

        $rawPrevious = $review->getRawOriginal('status');
        $previous = $rawPrevious instanceof ReviewStatus
            ? $rawPrevious
            : (is_string($rawPrevious) ? ReviewStatus::tryFrom($rawPrevious) : null);

        if ($previous !== ReviewStatus::Approved && $review->status !== ReviewStatus::Approved) {
            return;
        }

        GenerateReviewSummary::dispatch($review->product_id);
    }

    public function deleted(Review $review): void
    {
        if ($review->status === ReviewStatus::Approved) {
            GenerateReviewSummary::dispatch($review->product_id);
        }
    }
}
