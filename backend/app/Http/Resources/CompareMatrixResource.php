<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Data\Compare\CompareMatrix;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CompareMatrix
 */
class CompareMatrixResource extends JsonResource
{
    /**
     * Transform a built comparison matrix into the public compare API payload.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var CompareMatrix $matrix */
        $matrix = $this->resource;

        return [
            'category' => [
                'id' => $matrix->category->id,
                'name' => $matrix->category->name,
                'slug' => $matrix->category->slug,
            ],
            'products' => ProductSummaryResource::collection($matrix->products),
            'rows' => $matrix->rows,
        ];
    }
}
