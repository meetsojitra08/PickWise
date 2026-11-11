<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Brand;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Brand
 */
class BrandResource extends JsonResource
{
    /**
     * Transform a brand into the public API payload.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'logo_url' => MediaUrl::fromPublicPath($this->logo_path),
        ];
    }
}
