<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Data\Compare\SavedComparisonView;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin SavedComparisonView
 */
class ComparisonDetailResource extends JsonResource
{
    /**
     * Transform a saved comparison and its live matrix for the owner.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var SavedComparisonView $view */
        $view = $this->resource;
        $comparison = $view->comparison;

        return [
            'id' => $comparison->id,
            'name' => $comparison->name,
            'share_token' => $comparison->share_token,
            'is_shared' => $comparison->isShared(),
            'item_count' => $view->products->count(),
            'unavailable_count' => $view->unavailableCount,
            'items' => ProductSummaryResource::collection($view->products),
            'matrix' => $view->matrix !== null
                ? new CompareMatrixResource($view->matrix)
                : null,
            'created_at' => $comparison->created_at?->toIso8601ZuluString(),
            'updated_at' => $comparison->updated_at?->toIso8601ZuluString(),
        ];
    }
}
