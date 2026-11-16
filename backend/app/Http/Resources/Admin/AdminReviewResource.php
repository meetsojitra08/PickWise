<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Review
 */
final class AdminReviewResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product' => $this->product !== null ? [
                'id' => $this->product->id,
                'name' => $this->product->name,
                'slug' => $this->product->slug,
                'is_published' => (bool) $this->product->is_published,
                'rating_avg' => round((float) $this->product->rating_avg, 2),
                'rating_count' => (int) $this->product->rating_count,
            ] : null,
            'user' => $this->user !== null ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ] : null,
            'author_name' => ($this->user_id === null ? $this->author_name : $this->user?->name) ?? $this->author_name ?? 'Customer',
            'rating' => (int) $this->rating,
            'title' => $this->title,
            'body' => $this->body,
            'status' => $this->status->value,
            'moderator' => $this->moderator !== null ? [
                'id' => $this->moderator->id,
                'name' => $this->moderator->name,
                'email' => $this->moderator->email,
            ] : null,
            'moderated_by' => $this->moderated_by,
            'moderated_at' => $this->moderated_at?->toIso8601ZuluString(),
            'created_at' => $this->created_at?->toIso8601ZuluString(),
            'updated_at' => $this->updated_at?->toIso8601ZuluString(),
        ];
    }
}
