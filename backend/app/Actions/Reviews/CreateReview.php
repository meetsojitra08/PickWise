<?php

declare(strict_types=1);

namespace App\Actions\Reviews;

use App\Enums\ReviewStatus;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;

final class CreateReview
{
    /** @param array{rating: int, title: string, body: string} $attributes */
    public function execute(Product $product, User $user, array $attributes): Review
    {
        $review = $product->reviews()->make([
            ...$attributes,
            'user_id' => $user->id,
        ]);
        $review->status = ReviewStatus::Pending;
        $review->save();

        return $review;
    }
}
