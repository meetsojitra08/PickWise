<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Actions\Admin\GetAdminDashboardStats;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminDashboardResource;
use Illuminate\Support\Facades\Gate;

final class AdminDashboardController extends Controller
{
    /**
     * Return KPI tiles, AI usage summary, and recent activity for the admin dashboard.
     */
    public function __invoke(GetAdminDashboardStats $getAdminDashboardStats): AdminDashboardResource
    {
        Gate::authorize('access-admin');

        return new AdminDashboardResource($getAdminDashboardStats->execute());
    }
}
