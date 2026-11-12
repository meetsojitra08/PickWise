<?php

declare(strict_types=1);

namespace App\Queries\Reviews;

use App\Enums\ReviewStatus;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class ProductReviewsQuery
{
    /** @return array{reviews: LengthAwarePaginator, distribution: array<int, int>, own_pending_review: Review|null} */
    public function forProduct(Product $product, ?User $user, int $page, int $perPage): array
    {
        $reviews = Review::query()
            ->where('product_id', $product->id)
            ->where(function ($query) use ($user): void {
                $query->where('status', ReviewStatus::Approved);
                if ($user !== null) {
                    $query->orWhere(fn ($own) => $own->where('user_id', $user->id)->where('status', ReviewStatus::Pending));
                }
            })
            ->with('user:id,name')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage, ['*'], 'page', $page);

        $counts = Review::query()
            ->approved()
            ->where('product_id', $product->id)
            ->selectRaw('rating, COUNT(*) AS aggregate')
            ->groupBy('rating')
            ->pluck('aggregate', 'rating');

        $distribution = [];
        foreach (range(5, 1) as $rating) {
            $distribution[$rating] = (int) ($counts[$rating] ?? 0);
        }

        $ownPending = $user === null ? null : Review::query()
            ->where('product_id', $product->id)
            ->where('user_id', $user->id)
            ->where('status', ReviewStatus::Pending)
            ->with('user:id,name')
            ->first();

        return ['reviews' => $reviews, 'distribution' => $distribution, 'own_pending_review' => $ownPending];
    }
}
