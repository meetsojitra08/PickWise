<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Actions\Reviews\CreateReview;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reviews\IndexReviewsRequest;
use App\Http\Requests\Reviews\StoreReviewRequest;
use App\Http\Resources\ReviewResource;
use App\Models\Product;
use App\Models\User;
use App\Queries\Reviews\ProductReviewsQuery;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class ProductReviewController extends Controller
{
    public function __construct(private readonly ProductReviewsQuery $reviews) {}

    public function index(IndexReviewsRequest $request, string $slug): JsonResponse
    {
        $product = Product::query()->published()->where('slug', $slug)->firstOrFail();
        $perPage = (int) $request->validated('per_page', 10);
        $page = (int) $request->validated('page', 1);
        $result = $this->reviews->forProduct($product, $request->user(), $page, $perPage);

        return ReviewResource::collection($result['reviews'])
            ->additional(['meta' => [
                'rating_distribution' => $result['distribution'],
                'own_pending_review' => $result['own_pending_review'] === null
                    ? null
                    : (new ReviewResource($result['own_pending_review']))->toArray($request),
                'has_reviewed' => $result['has_reviewed'],
            ]])
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    public function store(StoreReviewRequest $request, string $slug, CreateReview $createReview): JsonResponse
    {
        $product = Product::query()->published()->where('slug', $slug)->firstOrFail();
        /** @var User $user */
        $user = $request->user();
        $review = $createReview->execute($product, $user, $request->validated());

        return (new ReviewResource($review->load('user:id,name')))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }
}
