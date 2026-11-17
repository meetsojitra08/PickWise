<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Models\AiUsageLog;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/**
 * @property array{
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
 * } $resource
 */
final class AdminAiUsageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'summary' => $this->resource['summary'],
            'by_feature' => $this->resource['by_feature'],
            'daily_usage' => $this->resource['daily_usage'],
            'top_users' => $this->resource['top_users'],
            'guest_calls' => $this->resource['guest_calls'],
            'logs' => AdminAiUsageLogResource::collection($this->resource['logs'])->resolve(),
            'pagination' => [
                'current_page' => $this->resource['logs']->currentPage(),
                'last_page' => $this->resource['logs']->lastPage(),
                'per_page' => $this->resource['logs']->perPage(),
                'total' => $this->resource['logs']->total(),
            ],
            'date_range' => [
                'start_date' => $this->resource['start_date']->format('Y-m-d'),
                'end_date' => $this->resource['end_date']->format('Y-m-d'),
            ],
        ];
    }
}
