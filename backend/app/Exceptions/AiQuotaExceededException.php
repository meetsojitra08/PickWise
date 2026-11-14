<?php

declare(strict_types=1);

namespace App\Exceptions;

use App\Enums\ApiErrorCode;
use Carbon\CarbonImmutable;
use Symfony\Component\HttpFoundation\Response;

final class AiQuotaExceededException extends ApiException
{
    public function __construct(
        int $limit,
        CarbonImmutable $resetsAt,
        int $retryAfterSeconds,
    ) {
        parent::__construct(
            errorCode: ApiErrorCode::AiQuotaExceeded,
            message: "You've used today's AI answers. Browse and filter products in the meantime.",
            statusCode: Response::HTTP_TOO_MANY_REQUESTS,
            details: [
                'limit' => $limit,
                'remaining' => 0,
                'resets_at' => $resetsAt->toIso8601ZuluString(),
            ],
            headers: ['Retry-After' => (string) $retryAfterSeconds],
        );
    }
}
