<?php

declare(strict_types=1);

namespace App\Actions\Comparisons;

use App\Models\Comparison;

final class StopSharingComparison
{
    /**
     * Clearing the token immediately revokes the public link; the comparison stays saved.
     */
    public function execute(Comparison $comparison): Comparison
    {
        $comparison->forceFill(['share_token' => null])->save();

        return $comparison;
    }
}
