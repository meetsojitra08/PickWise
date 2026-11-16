<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Enums\AiUsageStatus;
use App\Enums\ReviewStatus;
use App\Enums\UserRole;
use App\Models\AdminActivityLog;
use App\Models\AiUsageLog;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Carbon;

final class GetAdminDashboardStats
{
    /**
     * Compute and aggregate statistics for the administrative dashboard.
     *
     * @return array{
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
     *     recent_activity: EloquentCollection<int, AdminActivityLog>,
     *     pending_reviews: EloquentCollection<int, Review>
     * }
     */
    public function execute(): array
    {
        $todayUtcStart = Carbon::now('UTC')->startOfDay();

        // 1. Products count
        $totalProducts = Product::query()->count();
        $publishedProducts = Product::query()->where('is_published', true)->count();
        $unpublishedProducts = $totalProducts - $publishedProducts;

        // 2. Users count
        $totalUsers = User::query()->count();
        $activeUsers = User::query()->where('is_active', true)->count();
        $customerUsers = User::query()->where('role', UserRole::Customer)->count();
        $adminUsers = User::query()->where('role', UserRole::Admin)->count();

        // 3. Pending reviews count
        $pendingReviewsCount = Review::query()
            ->where('status', ReviewStatus::Pending)
            ->count();

        // 4. AI usage today
        $aiUsageTodayQuery = AiUsageLog::query()->where('created_at', '>=', $todayUtcStart);
        $aiCallsToday = (clone $aiUsageTodayQuery)->count();
        $aiSuccessfulCalls = (clone $aiUsageTodayQuery)->where('status', AiUsageStatus::Ok)->count();
        $aiFailedCalls = (clone $aiUsageTodayQuery)->where('status', '!=', AiUsageStatus::Ok)->count();
        $aiTotalTokens = (int) (clone $aiUsageTodayQuery)->sum('prompt_tokens') +
            (int) (clone $aiUsageTodayQuery)->sum('completion_tokens');
        $aiAvgLatency = (int) round((float) ((clone $aiUsageTodayQuery)->avg('latency_ms') ?? 0));

        // 5. Recent administrative activity logs (latest 5 with admin author)
        $recentActivity = AdminActivityLog::query()
            ->with(['admin:id,name,email'])
            ->latest('created_at')
            ->latest('id')
            ->limit(5)
            ->get();

        // 6. Recent pending reviews preview (latest 5 pending reviews)
        $pendingReviews = Review::query()
            ->with(['product:id,name,slug'])
            ->where('status', ReviewStatus::Pending)
            ->latest('created_at')
            ->latest('id')
            ->limit(5)
            ->get();

        return [
            'counts' => [
                'products' => [
                    'total' => $totalProducts,
                    'published' => $publishedProducts,
                    'unpublished' => $unpublishedProducts,
                ],
                'users' => [
                    'total' => $totalUsers,
                    'active' => $activeUsers,
                    'customers' => $customerUsers,
                    'admins' => $adminUsers,
                ],
                'pending_reviews' => $pendingReviewsCount,
                'ai_calls_today' => $aiCallsToday,
            ],
            'ai_usage_today' => [
                'total_calls' => $aiCallsToday,
                'successful_calls' => $aiSuccessfulCalls,
                'failed_calls' => $aiFailedCalls,
                'total_tokens' => $aiTotalTokens,
                'avg_latency_ms' => $aiAvgLatency,
            ],
            'recent_activity' => $recentActivity,
            'pending_reviews' => $pendingReviews,
        ];
    }
}
