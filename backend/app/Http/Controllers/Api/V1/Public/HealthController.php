<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Enums\ApiErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\HealthCheckService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HealthController extends Controller
{
    public function __construct(
        private readonly HealthCheckService $healthCheck,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $result = $this->healthCheck->check();

        if (! $result['healthy']) {
            return ApiResponse::error(
                code: ApiErrorCode::ServiceUnavailable,
                message: 'One or more dependencies are unavailable.',
                status: 503,
                details: $result['checks'],
                request: $request,
            );
        }

        return ApiResponse::success([
            'status' => 'ok',
            ...$result['checks'],
        ]);
    }
}
