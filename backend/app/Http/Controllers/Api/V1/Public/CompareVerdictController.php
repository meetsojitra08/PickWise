<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Compare\CompareVerdictRequest;
use App\Http\Resources\CompareVerdictResource;
use App\Services\CompareVerdictService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class CompareVerdictController extends Controller
{
    public function __construct(
        private readonly CompareVerdictService $verdictService,
    ) {}

    public function __invoke(CompareVerdictRequest $request): JsonResponse
    {
        $result = $this->verdictService->generate(
            productIds: $request->productIds(),
            priority: $request->priority(),
            user: $request->user(),
            request: $request,
            comparisonId: $request->comparisonId(),
        );

        return (new CompareVerdictResource($result))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }
}
