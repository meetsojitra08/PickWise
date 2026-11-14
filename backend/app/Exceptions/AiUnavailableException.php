<?php

declare(strict_types=1);

namespace App\Exceptions;

use App\Enums\AiFailureReason;
use App\Enums\ApiErrorCode;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

final class AiUnavailableException extends ApiException
{
    public function __construct(
        public readonly AiFailureReason $reason,
        string $message = 'The AI service is unavailable. Please try again.',
        ?Throwable $previous = null,
    ) {
        parent::__construct(
            errorCode: ApiErrorCode::AiUnavailable,
            message: $message,
            statusCode: Response::HTTP_SERVICE_UNAVAILABLE,
            previous: $previous,
        );
    }

    public static function notConfigured(): self
    {
        return new self(AiFailureReason::NotConfigured);
    }
}
