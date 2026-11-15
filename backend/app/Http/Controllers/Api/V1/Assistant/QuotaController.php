<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Assistant;

use App\Http\Controllers\Controller;
use App\Http\Resources\AiQuotaResource;
use App\Services\AiQuotaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class QuotaController extends Controller
{
    public function __construct(
        private readonly AiQuotaService $quota,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        return (new AiQuotaResource($this->quota->snapshot($request)))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }
}
