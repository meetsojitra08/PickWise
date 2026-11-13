<?php

declare(strict_types=1);

namespace App\Actions\Comparisons;

use App\Models\Comparison;

final class DeleteComparison
{
    public function execute(Comparison $comparison): void
    {
        $comparison->delete();
    }
}
