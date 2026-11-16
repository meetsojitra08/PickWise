<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Actions\Admin\GetAdminAiUsageStats;
use App\Enums\AiFeature;
use App\Enums\AiUsageStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexAiUsageRequest;
use App\Http\Resources\Admin\AdminAiUsageResource;

final class AdminAiUsageController extends Controller
{
    /**
     * Return AI usage telemetry, feature breakdown, daily timeseries, top users, and logs.
     */
    public function __invoke(
        IndexAiUsageRequest $request,
        GetAdminAiUsageStats $getAdminAiUsageStats,
    ): AdminAiUsageResource {
        $feature = $request->filled('feature')
            ? AiFeature::from((string) $request->input('feature'))
            : null;

        $status = $request->filled('status')
            ? AiUsageStatus::from((string) $request->input('status'))
            : null;

        $userId = $request->filled('user_id')
            ? (int) $request->input('user_id')
            : null;

        $perPage = (int) $request->input('per_page', 20);
        $page = (int) $request->input('page', 1);

        $stats = $getAdminAiUsageStats->execute(
            startDate: $request->startDate(),
            endDate: $request->endDate(),
            feature: $feature,
            status: $status,
            userId: $userId,
            perPage: $perPage,
            page: $page,
        );

        return new AdminAiUsageResource($stats);
    }
}
