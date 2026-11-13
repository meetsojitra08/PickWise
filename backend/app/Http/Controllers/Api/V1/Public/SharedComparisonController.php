<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\SharedComparisonResource;
use App\Models\Comparison;
use App\Services\SavedComparisonViewBuilder;
use Illuminate\Http\JsonResponse;

class SharedComparisonController extends Controller
{
    public function __construct(
        private readonly SavedComparisonViewBuilder $viewBuilder,
    ) {}

    public function __invoke(string $token): JsonResponse
    {
        $comparison = Comparison::query()
            ->where('share_token', $token)
            ->firstOrFail();

        return (new SharedComparisonResource($this->viewBuilder->build($comparison)))
            ->response()
            ->setStatusCode(200);
    }
}
