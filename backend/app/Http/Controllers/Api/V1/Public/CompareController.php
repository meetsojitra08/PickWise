<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Compare\CompareProductsRequest;
use App\Http\Resources\CompareMatrixResource;
use App\Services\CompareMatrixBuilder;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class CompareController extends Controller
{
    public function __construct(
        private readonly CompareMatrixBuilder $matrixBuilder,
    ) {}

    public function __invoke(CompareProductsRequest $request): JsonResponse
    {
        $matrix = $this->matrixBuilder->build($request->productIds());

        return (new CompareMatrixResource($matrix))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }
}
