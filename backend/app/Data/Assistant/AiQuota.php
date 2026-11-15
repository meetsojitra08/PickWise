<?php

declare(strict_types=1);

namespace App\Data\Assistant;

use Carbon\CarbonImmutable;

final readonly class AiQuota
{
    public function __construct(
        public int $limit,
        public int $used,
        public int $remaining,
        public CarbonImmutable $resetsAt,
    ) {}
}
