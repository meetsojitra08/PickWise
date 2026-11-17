<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Actions\Admin\GetAdminActivityLogs;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexAdminActivityLogsRequest;
use App\Http\Resources\Admin\AdminActivityLogResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class AdminActivityLogController extends Controller
{
    /**
     * Return paginated administrative activity logs with filters.
     */
    public function __invoke(
        IndexAdminActivityLogsRequest $request,
        GetAdminActivityLogs $getAdminActivityLogs,
    ): AnonymousResourceCollection {
        $adminId = $request->filled('admin_id') ? (int) $request->input('admin_id') : null;
        $action = $request->filled('action') ? (string) $request->input('action') : null;
        $subjectType = $request->filled('subject_type') ? (string) $request->input('subject_type') : null;
        $search = $request->filled('search')
            ? (string) $request->input('search')
            : ($request->filled('q') ? (string) $request->input('q') : null);

        $perPage = (int) $request->input('per_page', 20);
        $page = (int) $request->input('page', 1);

        $logs = $getAdminActivityLogs->execute(
            startDate: $request->startDate(),
            endDate: $request->endDate(),
            adminId: $adminId,
            action: $action,
            subjectType: $subjectType,
            search: $search,
            perPage: $perPage,
            page: $page,
        );

        return AdminActivityLogResource::collection($logs);
    }
}
