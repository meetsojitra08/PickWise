<?php

declare(strict_types=1);

namespace App\Enums;

enum AiUsageStatus: string
{
    case Ok = 'ok';
    case Error = 'error';
    case RateLimited = 'rate_limited';
}
