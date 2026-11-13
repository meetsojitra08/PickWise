<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Data\Compare\SavedComparisonView;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin SavedComparisonView
 */
class SharedComparisonResource extends JsonResource
{
    /**
     * Transform a shared comparison into the public, read-only payload.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var SavedComparisonView $view */
        $view = $this->resource;

        return [
            'name' => $view->comparison->name,
            'unavailable_count' => $view->unavailableCount,
            'matrix' => $view->matrix !== null
                ? new CompareMatrixResource($view->matrix)
                : null,
        ];
    }
}
