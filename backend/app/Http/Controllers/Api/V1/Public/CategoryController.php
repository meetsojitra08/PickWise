<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryFiltersResource;
use App\Http\Resources\CategoryResource;
use App\Queries\Catalog\CategoryFilterFacetsQuery;
use App\Queries\Catalog\CategoryTreeQuery;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class CategoryController extends Controller
{
    public function __construct(
        private readonly CategoryTreeQuery $categoryTree,
        private readonly CategoryFilterFacetsQuery $categoryFilterFacets,
    ) {}

    public function index(): JsonResponse
    {
        return CategoryResource::collection($this->categoryTree->get())
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    public function filters(string $slug): JsonResponse
    {
        return (new CategoryFiltersResource($this->categoryFilterFacets->forSlug($slug)))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }
}
