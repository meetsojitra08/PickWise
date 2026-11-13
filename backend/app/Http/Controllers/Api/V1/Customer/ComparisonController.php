<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Customer;

use App\Actions\Comparisons\CreateComparison;
use App\Actions\Comparisons\DeleteComparison;
use App\Actions\Comparisons\ShareComparison;
use App\Actions\Comparisons\StopSharingComparison;
use App\Actions\Comparisons\UpdateComparison;
use App\Http\Controllers\Controller;
use App\Http\Requests\Comparison\IndexComparisonRequest;
use App\Http\Requests\Comparison\StoreComparisonRequest;
use App\Http\Requests\Comparison\UpdateComparisonRequest;
use App\Http\Resources\ComparisonDetailResource;
use App\Http\Resources\ComparisonResource;
use App\Http\Responses\ApiResponse;
use App\Models\Comparison;
use App\Models\User;
use App\Queries\Comparisons\UserComparisonsQuery;
use App\Services\SavedComparisonViewBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class ComparisonController extends Controller
{
    public const int DEFAULT_PER_PAGE = 12;

    public function __construct(
        private readonly UserComparisonsQuery $comparisons,
        private readonly SavedComparisonViewBuilder $viewBuilder,
        private readonly CreateComparison $createComparison,
        private readonly UpdateComparison $updateComparison,
        private readonly DeleteComparison $deleteComparison,
        private readonly ShareComparison $shareComparison,
        private readonly StopSharingComparison $stopSharingComparison,
    ) {}

    public function index(IndexComparisonRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $comparisons = $this->comparisons->forUser(
            $user,
            (int) $request->validated('page', 1),
            (int) $request->validated('per_page', self::DEFAULT_PER_PAGE),
        );

        return ComparisonResource::collection($comparisons)
            ->response()
            ->setStatusCode(SymfonyResponse::HTTP_OK);
    }

    public function store(StoreComparisonRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $comparison = $this->createComparison->execute(
            $user,
            (string) $request->validated('name'),
            $request->productIds(),
        );

        return (new ComparisonDetailResource($this->viewBuilder->build($comparison)))
            ->response()
            ->setStatusCode(SymfonyResponse::HTTP_CREATED);
    }

    public function show(Comparison $comparison): JsonResponse
    {
        $this->authorize('view', $comparison);

        return (new ComparisonDetailResource($this->viewBuilder->build($comparison)))
            ->response()
            ->setStatusCode(SymfonyResponse::HTTP_OK);
    }

    public function update(UpdateComparisonRequest $request, Comparison $comparison): JsonResponse
    {
        $this->authorize('update', $comparison);
        $name = $request->validated('name');
        $productIds = $request->has('product_ids') ? $request->productIds() : null;
        $updated = $this->updateComparison->execute(
            $comparison,
            is_string($name) ? $name : null,
            $productIds,
        );

        return (new ComparisonDetailResource($this->viewBuilder->build($updated)))
            ->response()
            ->setStatusCode(SymfonyResponse::HTTP_OK);
    }

    public function destroy(Comparison $comparison): Response
    {
        $this->authorize('delete', $comparison);
        $this->deleteComparison->execute($comparison);

        return ApiResponse::noContent();
    }

    public function share(Comparison $comparison): JsonResponse
    {
        $this->authorize('share', $comparison);
        $shared = $this->shareComparison->execute($comparison);

        return ApiResponse::success([
            'share_token' => $shared->share_token,
        ]);
    }

    public function unshare(Comparison $comparison): Response
    {
        $this->authorize('share', $comparison);
        $this->stopSharingComparison->execute($comparison);

        return ApiResponse::noContent();
    }
}
