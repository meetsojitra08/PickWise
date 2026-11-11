<?php

declare(strict_types=1);

use App\Enums\ApiErrorCode;

test('api error code maps standard http status codes', function (int $status, ApiErrorCode $expected): void {
    expect(ApiErrorCode::fromStatus($status))->toBe($expected);
})->with([
    '400 bad request' => [400, ApiErrorCode::BadRequest],
    '401 unauthenticated' => [401, ApiErrorCode::Unauthenticated],
    '403 forbidden' => [403, ApiErrorCode::Forbidden],
    '404 not found' => [404, ApiErrorCode::NotFound],
    '405 method not allowed' => [405, ApiErrorCode::MethodNotAllowed],
    '409 conflict' => [409, ApiErrorCode::Conflict],
    '419 csrf mismatch' => [419, ApiErrorCode::CsrfTokenMismatch],
    '422 validation failed' => [422, ApiErrorCode::ValidationFailed],
    '429 rate limited' => [429, ApiErrorCode::RateLimited],
    '503 service unavailable' => [503, ApiErrorCode::ServiceUnavailable],
    '500 internal error' => [500, ApiErrorCode::InternalError],
    '502 internal error fallback' => [502, ApiErrorCode::InternalError],
    '418 client error fallback' => [418, ApiErrorCode::BadRequest],
]);
