<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\PriceHistory;
use App\Models\Product;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property-read Product $resource */
class ProductPriceHistoryResource extends JsonResource
{
    /**
     * Shape a product's price history as the chart series and retain money precision.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $product = $this->resource;

        return [
            'currency' => $product->currency,
            'points' => $product->priceHistory->map(fn (PriceHistory $point): array => [
                'recorded_at' => $point->recorded_at->toDateString(),
                'price' => Money::toArray($point->price, $product->currency),
            ])->values()->all(),
        ];
    }
}
