<?php

declare(strict_types=1);

namespace App\Actions\Reviews;

use App\Enums\ReviewStatus;
use App\Models\Review;
use App\Services\ProductRatingAggregator;
use Illuminate\Support\Facades\DB;

final class DeleteReview
{
    public function __construct(private readonly ProductRatingAggregator $ratingAggregator) {}

    public function execute(Review $review): void
    {
        DB::transaction(function () use ($review): void {
            $product = $review->product;
            $wasApproved = $review->status === ReviewStatus::Approved;
            $review->delete();

            if ($wasApproved) {
                $this->ratingAggregator->recalculate($product);
            }
        });
    }
}
