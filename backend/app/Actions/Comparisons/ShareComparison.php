<?php

declare(strict_types=1);

namespace App\Actions\Comparisons;

use App\Models\Comparison;
use Illuminate\Support\Str;

final class ShareComparison
{
    /**
     * Create or return the unguessable token used by the public read-only view.
     */
    public function execute(Comparison $comparison): Comparison
    {
        if ($comparison->isShared()) {
            return $comparison;
        }

        do {
            $token = Str::random(32);
        } while (Comparison::query()->where('share_token', $token)->exists());

        $comparison->forceFill(['share_token' => $token])->save();

        return $comparison;
    }
}
