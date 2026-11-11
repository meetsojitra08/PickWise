<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\SearchProductsRequest;
use App\Http\Resources\ProductSummaryResource;
use App\Queries\Catalog\ProductSearchQuery;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class ProductController extends Controller
{
    public function __construct(
        private readonly ProductSearchQuery $productSearch,
    ) {}

    public function index(SearchProductsRequest $request): JsonResponse
    {
        return ProductSummaryResource::collection($this->productSearch->search($request->toCriteria()))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }
}
