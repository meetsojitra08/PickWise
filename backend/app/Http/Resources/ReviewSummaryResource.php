<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ReviewSummary;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ReviewSummary
 */
class ReviewSummaryResource extends JsonResource
{
    /**
     * Expose the stored summary only; the product page never waits for the AI.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'summary' => $this->summary,
            'pros' => array_values($this->pros),
            'cons' => array_values($this->cons),
            'sentiment' => $this->sentiment->value,
            'reviews_count' => $this->reviews_count,
            'generated_at' => $this->generated_at->toIso8601ZuluString(),
        ];
    }
}
