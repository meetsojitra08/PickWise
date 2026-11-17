<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Models\AdminActivityLog;
use App\Models\Review;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property array{
 *     counts: array{
 *         products: array{total: int, published: int, unpublished: int},
 *         users: array{total: int, active: int, customers: int, admins: int},
 *         pending_reviews: int,
 *         ai_calls_today: int
 *     },
 *     ai_usage_today: array{
 *         total_calls: int,
 *         successful_calls: int,
 *         failed_calls: int,
 *         total_tokens: int,
 *         avg_latency_ms: int
 *     },
 *     recent_activity: Collection<int, AdminActivityLog>,
 *     pending_reviews: Collection<int, Review>
 * } $resource
 */
class AdminDashboardResource extends JsonResource
{
    /**
     * Transform the admin dashboard statistics into an API array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'counts' => $this->resource['counts'],
            'ai_usage_today' => $this->resource['ai_usage_today'],
            'recent_activity' => $this->resource['recent_activity']->map(static fn (AdminActivityLog $log): array => [
                'id' => $log->id,
                'admin' => $log->admin !== null ? [
                    'id' => $log->admin->id,
                    'name' => $log->admin->name,
                    'email' => $log->admin->email,
                ] : null,
                'action' => $log->action,
                'subject_type' => $log->subject_type,
                'subject_id' => $log->subject_id,
                'changes' => $log->changes,
                'ip_address' => $log->ip_address,
                'created_at' => $log->created_at->toIso8601String(),
            ])->values()->all(),
            'pending_reviews' => $this->resource['pending_reviews']->map(static fn (Review $review): array => [
                'id' => $review->id,
                'product' => $review->product !== null ? [
                    'id' => $review->product->id,
                    'name' => $review->product->name,
                    'slug' => $review->product->slug,
                ] : null,
                'author_name' => $review->author_name,
                'rating' => $review->rating,
                'title' => $review->title,
                'body' => $review->body,
                'created_at' => $review->created_at->toIso8601String(),
            ])->values()->all(),
        ];
    }
}
