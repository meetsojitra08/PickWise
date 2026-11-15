<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Data\Compare\CompareVerdictProduct;
use App\Data\Compare\CompareVerdictResult;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CompareVerdictResult
 */
class CompareVerdictResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var CompareVerdictResult $result */
        $result = $this->resource;

        return [
            'verdict' => $result->verdict,
            'products' => array_map(
                static fn (CompareVerdictProduct $product): array => $product->toArray(),
                $result->products,
            ),
            'quota' => (new AiQuotaResource($result->quota))->toArray($request),
            'comparison_id' => $result->comparisonId,
        ];
    }
}
