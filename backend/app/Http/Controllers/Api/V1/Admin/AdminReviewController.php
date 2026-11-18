<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BulkModerateReviewsRequest;
use App\Http\Requests\Admin\IndexReviewsRequest;
use App\Http\Requests\Admin\ModerateReviewRequest;
use App\Http\Resources\Admin\AdminReviewResource;
use App\Http\Responses\ApiResponse;
use App\Jobs\GenerateReviewSummary;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\ProductRatingAggregator;
use App\Services\ValueScoreCalculator;
use App\Support\LikePattern;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class AdminReviewController extends Controller
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly ProductRatingAggregator $ratingAggregator,
        private readonly ValueScoreCalculator $valueScoreCalculator,
    ) {}

    /**
     * List reviews for administrative moderation with status, search, and rating filters.
     */
    public function index(IndexReviewsRequest $request): AnonymousResourceCollection
    {
        $query = Review::query()
            ->with([
                'product:id,name,slug,is_published,rating_avg,rating_count,category_id',
                'user:id,name,email',
                'moderator:id,name,email',
            ]);

        $status = (string) $request->input('status', ReviewStatus::Pending->value);
        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $search = (string) ($request->input('search') ?? $request->input('q') ?? '');
        if (trim($search) !== '') {
            $pattern = LikePattern::containsLower($search);
            $query->where(static function ($q) use ($pattern): void {
                $q->whereRaw("LOWER(title) LIKE ? ESCAPE '!'", [$pattern])
                    ->orWhereRaw("LOWER(body) LIKE ? ESCAPE '!'", [$pattern])
                    ->orWhereRaw("LOWER(author_name) LIKE ? ESCAPE '!'", [$pattern])
                    ->orWhereHas('product', static function ($pq) use ($pattern): void {
                        $pq->whereRaw("LOWER(name) LIKE ? ESCAPE '!'", [$pattern]);
                    })
                    ->orWhereHas('user', static function ($uq) use ($pattern): void {
                        $uq->whereRaw("LOWER(name) LIKE ? ESCAPE '!'", [$pattern])
                            ->orWhereRaw("LOWER(email) LIKE ? ESCAPE '!'", [$pattern]);
                    });
            });
        }

        if ($request->filled('rating')) {
            $query->where('rating', (int) $request->input('rating'));
        }

        if ($request->filled('product_id')) {
            $query->where('product_id', (int) $request->input('product_id'));
        }

        $sort = (string) $request->input('sort', '-created_at');
        match ($sort) {
            'created_at' => $query->orderBy('created_at')->orderBy('id'),
            '-created_at' => $query->orderByDesc('created_at')->orderByDesc('id'),
            'rating' => $query->orderBy('rating')->orderBy('id'),
            '-rating' => $query->orderByDesc('rating')->orderByDesc('id'),
            'status' => $query->orderBy('status')->orderBy('id'),
            '-status' => $query->orderByDesc('status')->orderByDesc('id'),
            default => $query->orderByDesc('created_at')->orderByDesc('id'),
        };

        $perPage = (int) $request->input('per_page', 25);
        $reviews = $query->paginate($perPage);

        return AdminReviewResource::collection($reviews);
    }

    /**
     * Moderate a single review: approve or reject with optional reason, updating ratings.
     */
    public function update(ModerateReviewRequest $request, Review $review): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();

        $oldStatus = $review->status;
        $targetStatus = ReviewStatus::from((string) $request->input('status'));
        $reason = $request->input('reason');

        $review->status = $targetStatus;
        if ($targetStatus === ReviewStatus::Pending) {
            $review->moderated_by = null;
            $review->moderated_at = null;
        } else {
            $review->moderated_by = $admin->id;
            $review->moderated_at = now();
        }

        $review->save();

        if ($oldStatus === ReviewStatus::Approved || $targetStatus === ReviewStatus::Approved) {
            /** @var Product $product */
            $product = $review->product;
            $this->ratingAggregator->recalculate($product);
            $this->valueScoreCalculator->recalculateCategory($product->category_id);
        }

        $changes = [
            'before' => ['status' => $oldStatus->value],
            'after' => [
                'status' => $targetStatus->value,
                'moderated_by' => $review->moderated_by,
                'moderated_at' => $review->moderated_at?->toIso8601ZuluString(),
            ],
        ];

        if ($reason !== null && trim((string) $reason) !== '') {
            $changes['reason'] = trim((string) $reason);
        }

        $this->auditLogger->record(
            admin: $admin,
            action: 'review.moderated',
            subject: $review,
            changes: $changes,
        );

        $review->load(['product', 'user', 'moderator']);

        return ApiResponse::success(new AdminReviewResource($review));
    }

    /**
     * Bulk moderate multiple reviews: approve or reject in batch.
     */
    public function bulkStatus(BulkModerateReviewsRequest $request): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();

        /** @var list<int> $reviewIds */
        $reviewIds = array_map('intval', (array) $request->input('review_ids'));
        $targetStatus = ReviewStatus::from((string) $request->input('status'));
        $reason = $request->input('reason');

        $reviews = Review::query()
            ->whereIn('id', $reviewIds)
            ->with('product')
            ->get();

        $affectedCount = 0;
        /** @var array<int, Product> $affectedProducts */
        $affectedProducts = [];

        foreach ($reviews as $review) {
            $oldStatus = $review->status;
            $review->status = $targetStatus;
            $review->moderated_by = $admin->id;
            $review->moderated_at = now();
            $review->save();

            $affectedCount++;

            if ($review->product !== null && ($oldStatus === ReviewStatus::Approved || $targetStatus === ReviewStatus::Approved)) {
                $affectedProducts[$review->product->id] = $review->product;
            }
        }

        foreach ($affectedProducts as $product) {
            $this->ratingAggregator->recalculate($product);
            $this->valueScoreCalculator->recalculateCategory($product->category_id);
            GenerateReviewSummary::dispatch($product->id);
        }

        $changes = [
            'review_ids' => $reviewIds,
            'status' => $targetStatus->value,
            'count' => $affectedCount,
        ];

        if ($reason !== null && trim((string) $reason) !== '') {
            $changes['reason'] = trim((string) $reason);
        }

        $this->auditLogger->record(
            admin: $admin,
            action: 'review.bulk_moderated',
            subject: null,
            changes: $changes,
        );

        return ApiResponse::success([
            'count' => $affectedCount,
            'status' => $targetStatus->value,
        ]);
    }

    /**
     * Delete a review and update product ratings and audit trail.
     */
    public function destroy(Review $review, Request $request): Response
    {
        Gate::authorize('delete', $review);

        /** @var User $admin */
        $admin = $request->user();
        $wasApproved = $review->status === ReviewStatus::Approved;
        $before = $review->getAttributes();
        /** @var Product $product */
        $product = $review->product;

        $review->delete();

        if ($wasApproved) {
            $this->ratingAggregator->recalculate($product);
            $this->valueScoreCalculator->recalculateCategory($product->category_id);
        }

        $this->auditLogger->logDeleted($admin, $review, $before);

        return ApiResponse::noContent();
    }
}
