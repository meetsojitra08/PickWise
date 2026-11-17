<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Enums\AiFeature;
use App\Enums\AiUsageStatus;
use App\Models\AiUsageLog;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

final class GetAdminAiUsageStats
{
    /**
     * Aggregate AI usage statistics, breakdown, timeseries, top users, and paginated logs.
     *
     * @return array{
     *     summary: array{
     *         total_calls: int,
     *         successful_calls: int,
     *         failed_calls: int,
     *         error_calls: int,
     *         rate_limited_calls: int,
     *         error_rate: float,
     *         total_tokens: int,
     *         prompt_tokens: int,
     *         completion_tokens: int,
     *         avg_latency_ms: int
     *     },
     *     by_feature: array<int, array{
     *         feature: string,
     *         total_calls: int,
     *         successful_calls: int,
     *         failed_calls: int,
     *         total_tokens: int,
     *         avg_latency_ms: int
     *     }>,
     *     daily_usage: array<int, array{
     *         date: string,
     *         total_calls: int,
     *         successful_calls: int,
     *         failed_calls: int,
     *         total_tokens: int,
     *         avg_latency_ms: int,
     *         by_feature: array<string, int>
     *     }>,
     *     top_users: array<int, array{
     *         user_id: int,
     *         name: string,
     *         email: string,
     *         total_calls: int,
     *         total_tokens: int,
     *         last_active_at: string|null
     *     }>,
     *     guest_calls: int,
     *     logs: LengthAwarePaginator<int, AiUsageLog>,
     *     start_date: Carbon,
     *     end_date: Carbon
     * }
     */
    public function execute(
        Carbon $startDate,
        Carbon $endDate,
        ?AiFeature $feature = null,
        ?AiUsageStatus $status = null,
        ?int $userId = null,
        int $perPage = 20,
        int $page = 1,
    ): array {
        // Base query bounded by date window
        $windowQuery = AiUsageLog::query()
            ->where('created_at', '>=', $startDate)
            ->where('created_at', '<=', $endDate);

        if ($feature !== null) {
            $windowQuery->where('feature', $feature->value);
        }

        if ($status !== null) {
            $windowQuery->where('status', $status->value);
        }

        if ($userId !== null) {
            $windowQuery->where('user_id', $userId);
        }

        // 1. KPI Summary
        $totalCalls = (clone $windowQuery)->count();
        $successfulCalls = (clone $windowQuery)->where('status', AiUsageStatus::Ok->value)->count();
        $errorCalls = (clone $windowQuery)->where('status', AiUsageStatus::Error->value)->count();
        $rateLimitedCalls = (clone $windowQuery)->where('status', AiUsageStatus::RateLimited->value)->count();
        $failedCalls = $errorCalls + $rateLimitedCalls;
        $errorRate = $totalCalls > 0 ? round(($failedCalls / $totalCalls) * 100, 2) : 0.0;

        $promptTokens = (int) (clone $windowQuery)->sum('prompt_tokens');
        $completionTokens = (int) (clone $windowQuery)->sum('completion_tokens');
        $totalTokens = $promptTokens + $completionTokens;
        $avgLatencyMs = (int) round((float) ((clone $windowQuery)->avg('latency_ms') ?? 0));

        // 2. Feature breakdown across the date window
        $featureBaseQuery = AiUsageLog::query()
            ->where('created_at', '>=', $startDate)
            ->where('created_at', '<=', $endDate);

        if ($userId !== null) {
            $featureBaseQuery->where('user_id', $userId);
        }

        $byFeature = [];
        foreach (AiFeature::cases() as $case) {
            $fQuery = (clone $featureBaseQuery)->where('feature', $case->value);
            $fTotal = (clone $fQuery)->count();
            $fSuccess = (clone $fQuery)->where('status', AiUsageStatus::Ok->value)->count();
            $fFailed = (clone $fQuery)->where('status', '!=', AiUsageStatus::Ok->value)->count();
            $fTokens = (int) (clone $fQuery)->sum('prompt_tokens') +
                (int) (clone $fQuery)->sum('completion_tokens');
            $fAvgLatency = (int) round((float) ((clone $fQuery)->avg('latency_ms') ?? 0));

            $byFeature[] = [
                'feature' => $case->value,
                'total_calls' => $fTotal,
                'successful_calls' => $fSuccess,
                'failed_calls' => $fFailed,
                'total_tokens' => $fTokens,
                'avg_latency_ms' => $fAvgLatency,
            ];
        }

        // 3. Daily timeseries aggregation
        /** @var Collection<string, object{date: string, total_calls: int|string, successful_calls: int|string, failed_calls: int|string, total_tokens: int|string, avg_latency_ms: int|string, assistant_calls: int|string, compare_calls: int|string, review_summary_calls: int|string}> $dailyRecords */
        $dailyRecords = (clone $windowQuery)
            ->toBase()
            ->selectRaw("DATE(created_at) as date,
                COUNT(*) as total_calls,
                COUNT(CASE WHEN status = 'ok' THEN 1 END) as successful_calls,
                COUNT(CASE WHEN status != 'ok' THEN 1 END) as failed_calls,
                COALESCE(SUM(COALESCE(prompt_tokens, 0) + COALESCE(completion_tokens, 0)), 0) as total_tokens,
                COALESCE(ROUND(AVG(latency_ms)), 0) as avg_latency_ms,
                COUNT(CASE WHEN feature = 'assistant' THEN 1 END) as assistant_calls,
                COUNT(CASE WHEN feature = 'compare' THEN 1 END) as compare_calls,
                COUNT(CASE WHEN feature = 'review_summary' THEN 1 END) as review_summary_calls")
            ->groupByRaw('DATE(created_at)')
            ->orderBy('date', 'asc')
            ->get()
            ->keyBy(static fn (object $row): string => (string) $row->date);

        $dailyUsage = [];
        $cursor = $startDate->copy()->startOfDay();
        $lastDay = $endDate->copy()->startOfDay();

        while ($cursor->lte($lastDay)) {
            $dayKey = $cursor->format('Y-m-d');
            $record = $dailyRecords->get($dayKey);

            $dailyUsage[] = [
                'date' => $dayKey,
                'total_calls' => $record !== null ? (int) $record->total_calls : 0,
                'successful_calls' => $record !== null ? (int) $record->successful_calls : 0,
                'failed_calls' => $record !== null ? (int) $record->failed_calls : 0,
                'total_tokens' => $record !== null ? (int) $record->total_tokens : 0,
                'avg_latency_ms' => $record !== null ? (int) $record->avg_latency_ms : 0,
                'by_feature' => [
                    'assistant' => $record !== null ? (int) $record->assistant_calls : 0,
                    'compare' => $record !== null ? (int) $record->compare_calls : 0,
                    'review_summary' => $record !== null ? (int) $record->review_summary_calls : 0,
                ],
            ];

            $cursor->addDay();
        }

        // 4. Top users by AI usage in this window
        /** @var Collection<int, object{user_id: int|string, total_calls: int|string, total_tokens: int|string, last_active_at: string|null}> $topUsersRaw */
        $topUsersRaw = (clone $featureBaseQuery)
            ->toBase()
            ->whereNotNull('user_id')
            ->selectRaw('user_id, COUNT(*) as total_calls, COALESCE(SUM(COALESCE(prompt_tokens, 0) + COALESCE(completion_tokens, 0)), 0) as total_tokens, MAX(created_at) as last_active_at')
            ->groupBy('user_id')
            ->orderByDesc('total_calls')
            ->limit(10)
            ->get();

        $topUserIds = $topUsersRaw->pluck('user_id')->map(static fn (mixed $id): int => (int) $id)->all();
        $usersById = User::query()->whereIn('id', $topUserIds)->get()->keyBy('id');

        $topUsers = [];
        foreach ($topUsersRaw as $row) {
            $userIdInt = (int) $row->user_id;
            $user = $usersById->get($userIdInt);
            if ($user !== null) {
                $lastActiveStr = $row->last_active_at !== null
                    ? Carbon::parse((string) $row->last_active_at)->toIso8601ZuluString()
                    : null;

                $topUsers[] = [
                    'user_id' => $userIdInt,
                    'name' => $user->name,
                    'email' => $user->email,
                    'total_calls' => (int) $row->total_calls,
                    'total_tokens' => (int) $row->total_tokens,
                    'last_active_at' => $lastActiveStr,
                ];
            }
        }

        $guestCalls = (clone $featureBaseQuery)->whereNull('user_id')->count();

        // 5. Paginated individual logs
        /** @var LengthAwarePaginator<int, AiUsageLog> $logs */
        $logs = (clone $windowQuery)
            ->with(['user:id,name,email'])
            ->latest('created_at')
            ->latest('id')
            ->paginate(perPage: $perPage, page: $page);

        return [
            'summary' => [
                'total_calls' => $totalCalls,
                'successful_calls' => $successfulCalls,
                'failed_calls' => $failedCalls,
                'error_calls' => $errorCalls,
                'rate_limited_calls' => $rateLimitedCalls,
                'error_rate' => $errorRate,
                'total_tokens' => $totalTokens,
                'prompt_tokens' => $promptTokens,
                'completion_tokens' => $completionTokens,
                'avg_latency_ms' => $avgLatencyMs,
            ],
            'by_feature' => $byFeature,
            'daily_usage' => $dailyUsage,
            'top_users' => $topUsers,
            'guest_calls' => $guestCalls,
            'logs' => $logs,
            'start_date' => $startDate,
            'end_date' => $endDate,
        ];
    }
}
