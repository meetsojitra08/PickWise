<?php

declare(strict_types=1);

namespace App\AI;

use App\Enums\AiFeature;
use App\Enums\AiUsageStatus;
use App\Enums\ApiErrorCode;
use App\Models\AiUsageLog;
use App\Models\User;
use Illuminate\Http\Request;

final class AiUsageLogger
{
    /**
     * Record one AI attempt for quotas and the admin usage dashboard.
     */
    public function record(
        AiFeature $feature,
        AiUsageStatus $status,
        ?User $user = null,
        ?string $model = null,
        ?int $promptTokens = null,
        ?int $completionTokens = null,
        ?int $latencyMs = null,
        ?string $errorCode = null,
    ): AiUsageLog {
        return AiUsageLog::create([
            'user_id' => $user?->getKey(),
            'feature' => $feature,
            'model' => $model,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'latency_ms' => $latencyMs,
            'status' => $status,
            'error_code' => $errorCode,
            'created_at' => now(),
        ]);
    }

    /**
     * Record a call rejected by the daily quota before any provider request.
     */
    public function rateLimited(Request $request, AiFeature $feature): AiUsageLog
    {
        $user = $request->user();

        return $this->record(
            feature: $feature,
            status: AiUsageStatus::RateLimited,
            user: $user instanceof User ? $user : null,
            errorCode: ApiErrorCode::AiQuotaExceeded->value,
        );
    }
}
