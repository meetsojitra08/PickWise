<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Services\HealthCheckService;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    public function __construct(
        private readonly HealthCheckService $healthCheck,
    ) {}

    public function __invoke(): JsonResponse
    {
        $result = $this->healthCheck->check();

        if (! $result['healthy']) {
            return response()->json([
                'error' => [
                    'code' => 'service_unavailable',
                    'message' => 'One or more dependencies are unavailable.',
                    'details' => $result['checks'],
                ],
            ], 503);
        }

        return response()->json([
            'data' => [
                'status' => 'ok',
                ...$result['checks'],
            ],
        ]);
    }
}
