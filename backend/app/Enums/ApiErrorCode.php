<?php

declare(strict_types=1);

namespace App\Enums;

enum ApiErrorCode: string
{
    case BadRequest = 'bad_request';
    case Unauthenticated = 'unauthenticated';
    case Forbidden = 'forbidden';
    case NotFound = 'not_found';
    case MethodNotAllowed = 'method_not_allowed';
    case Conflict = 'conflict';
    case CsrfTokenMismatch = 'csrf_token_mismatch';
    case ValidationFailed = 'validation_failed';
    case RateLimited = 'rate_limited';
    case AiQuotaExceeded = 'ai_quota_exceeded';
    case InternalError = 'internal_error';
    case ServiceUnavailable = 'service_unavailable';
    case AiUnavailable = 'ai_unavailable';

    /**
     * Map an HTTP status code to its default canonical API error code.
     */
    public static function fromStatus(int $status): self
    {
        return match ($status) {
            400 => self::BadRequest,
            401 => self::Unauthenticated,
            403 => self::Forbidden,
            404 => self::NotFound,
            405 => self::MethodNotAllowed,
            409 => self::Conflict,
            419 => self::CsrfTokenMismatch,
            422 => self::ValidationFailed,
            429 => self::RateLimited,
            503 => self::ServiceUnavailable,
            default => $status >= 500 ? self::InternalError : self::BadRequest,
        };
    }
}
