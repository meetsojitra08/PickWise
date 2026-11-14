<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Data\Assistant\AiQuota;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read AiQuota $resource
 */
class AiQuotaResource extends JsonResource
{
    /**
     * Transform today's AI quota into the small counter payload used by the UI.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var AiQuota $quota */
        $quota = $this->resource;

        return [
            'limit' => $quota->limit,
            'used' => $quota->used,
            'remaining' => $quota->remaining,
            'resets_at' => $quota->resetsAt->toIso8601ZuluString(),
        ];
    }
}
