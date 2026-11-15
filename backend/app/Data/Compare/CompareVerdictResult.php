<?php

declare(strict_types=1);

namespace App\Data\Compare;

use App\Data\Assistant\AiQuota;

final class CompareVerdictResult
{
    /**
     * @param  list<CompareVerdictProduct>  $products
     */
    public function __construct(
        public readonly string $verdict,
        public readonly array $products,
        public readonly AiQuota $quota,
        public readonly ?int $comparisonId = null,
    ) {}
}
