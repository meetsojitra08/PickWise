<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\SearchProductsRequest;
use App\Http\Resources\ProductDetailResource;
use App\Http\Resources\ProductPriceHistoryResource;
use App\Http\Resources\ProductSummaryResource;
use App\Queries\Catalog\ProductDetailQuery;
use App\Queries\Catalog\ProductPriceHistoryQuery;
use App\Queries\Catalog\ProductSearchQuery;
use App\Queries\Catalog\SimilarProductsQuery;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class ProductController extends Controller
{
    public function __construct(
        private readonly ProductSearchQuery $productSearch,
        private readonly ProductDetailQuery $productDetail,
        private readonly ProductPriceHistoryQuery $productPriceHistory,
        private readonly SimilarProductsQuery $similarProducts,
    ) {}

    public function index(SearchProductsRequest $request): JsonResponse
    {
        return ProductSummaryResource::collection($this->productSearch->search($request->toCriteria()))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    public function show(string $slug): JsonResponse
    {
        return (new ProductDetailResource($this->productDetail->forSlug($slug)))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    public function priceHistory(string $slug): JsonResponse
    {
        return (new ProductPriceHistoryResource($this->productPriceHistory->forSlug($slug)))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    public function similar(string $slug): JsonResponse
    {
        return ProductSummaryResource::collection($this->similarProducts->forSlug($slug))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }
}
