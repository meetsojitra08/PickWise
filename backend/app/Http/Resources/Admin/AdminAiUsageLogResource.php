<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Models\AiUsageLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AiUsageLog
 */
final class AdminAiUsageLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user' => $this->user !== null ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ] : null,
            'feature' => $this->feature->value,
            'model' => $this->model,
            'prompt_tokens' => $this->prompt_tokens,
            'completion_tokens' => $this->completion_tokens,
            'total_tokens' => ($this->prompt_tokens ?? 0) + ($this->completion_tokens ?? 0),
            'latency_ms' => $this->latency_ms,
            'status' => $this->status->value,
            'error_code' => $this->error_code,
            'created_at' => $this->created_at->toIso8601ZuluString(),
        ];
    }
}
