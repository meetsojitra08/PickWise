<?php

declare(strict_types=1);

namespace App\Actions\Reviews;

use App\Enums\ReviewStatus;
use App\Models\Review;
use App\Services\ProductRatingAggregator;
use Illuminate\Support\Facades\DB;

final class UpdateReview
{
    /** @param array{rating: int, title: string, body: string} $attributes */
    public function __construct(private readonly ProductRatingAggregator $ratingAggregator) {}

    /** @param array{rating: int, title: string, body: string} $attributes */
    public function execute(Review $review, array $attributes): Review
    {
        return DB::transaction(function () use ($review, $attributes): Review {
            $wasApproved = $review->status === ReviewStatus::Approved;
            $review->fill($attributes);
            $review->status = ReviewStatus::Pending;
            $review->save();

            if ($wasApproved) {
                $this->ratingAggregator->recalculate($review->product);
            }

            return $review->refresh();
        });
    }
}
