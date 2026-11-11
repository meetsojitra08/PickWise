<?php

declare(strict_types=1);

namespace App\Exceptions;

use App\Enums\ApiErrorCode;
use RuntimeException;
use Throwable;

class ApiException extends RuntimeException
{
    /**
     * @param  array<string, mixed>  $details
     * @param  array<string, string|array<int, string>>  $headers
     */
    public function __construct(
        public readonly ApiErrorCode|string $errorCode,
        string $message,
        public readonly int $statusCode = 400,
        public readonly array $details = [],
        public readonly array $headers = [],
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, $statusCode, $previous);
    }
}
