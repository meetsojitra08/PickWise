<?php

declare(strict_types=1);

namespace App\Exceptions;

use App\Enums\ApiErrorCode;
use App\Http\Responses\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\RecordNotFoundException;
use Illuminate\Database\RecordsNotFoundException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Exceptions\BackedEnumCaseNotFoundException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

final class ApiExceptionRenderer
{
    /**
     * Render exceptions for API or JSON requests into the standard error envelope.
     */
    public function render(Throwable $e, Request $request): ?JsonResponse
    {
        if (! $request->is('api/*') && ! $request->expectsJson()) {
            return null;
        }

        if ($e instanceof HttpResponseException) {
            return null;
        }

        if ($e instanceof ApiException) {
            return ApiResponse::error(
                code: $e->errorCode,
                message: $e->getMessage(),
                status: $e->statusCode,
                details: $e->details,
                request: $request,
                headers: $e->headers,
            );
        }

        if ($e instanceof ValidationException) {
            if ($e->response !== null) {
                return null;
            }

            return ApiResponse::error(
                code: ApiErrorCode::ValidationFailed,
                message: $e->getMessage() !== '' ? $e->getMessage() : 'The given data was invalid.',
                status: $e->status,
                details: $e->errors(),
                request: $request,
            );
        }

        if ($e instanceof AuthenticationException) {
            return ApiResponse::error(
                code: ApiErrorCode::Unauthenticated,
                message: $e->getMessage() !== '' ? $e->getMessage() : 'Unauthenticated.',
                status: Response::HTTP_UNAUTHORIZED,
                request: $request,
            );
        }

        if ($e instanceof AuthorizationException) {
            $status = $e->hasStatus() ? (int) $e->status() : Response::HTTP_FORBIDDEN;

            return ApiResponse::error(
                code: ApiErrorCode::fromStatus($status),
                message: $e->getMessage() !== '' ? $e->getMessage() : 'This action is unauthorized.',
                status: $status,
                request: $request,
            );
        }

        if ($e instanceof NotFoundHttpException) {
            return ApiResponse::error(
                code: ApiErrorCode::NotFound,
                message: $this->resolveNotFoundMessage($e),
                status: Response::HTTP_NOT_FOUND,
                request: $request,
                headers: $this->normalizeHeaders($e->getHeaders()),
            );
        }

        if ($e instanceof HttpExceptionInterface) {
            $status = $e->getStatusCode();

            return ApiResponse::error(
                code: ApiErrorCode::fromStatus($status),
                message: $this->resolveHttpExceptionMessage($e, $status),
                status: $status,
                request: $request,
                headers: $this->normalizeHeaders($e->getHeaders()),
            );
        }

        return $this->renderUnexpectedException($e, $request);
    }

    private function renderUnexpectedException(Throwable $e, Request $request): JsonResponse
    {
        $details = config('app.debug')
            ? [
                'exception' => $e::class,
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]
            : null;

        return ApiResponse::error(
            code: ApiErrorCode::InternalError,
            message: 'An unexpected error occurred.',
            status: Response::HTTP_INTERNAL_SERVER_ERROR,
            details: $details,
            request: $request,
        );
    }

    private function resolveNotFoundMessage(NotFoundHttpException $e): string
    {
        $previous = $e->getPrevious();

        if (
            $previous instanceof ModelNotFoundException
            || $previous instanceof RecordNotFoundException
            || $previous instanceof RecordsNotFoundException
            || $previous instanceof BackedEnumCaseNotFoundException
        ) {
            return 'Resource not found.';
        }

        $message = $e->getMessage();

        // Hide Laravel's internal "The route ... could not be found." phrasing on unmatched paths.
        if ($message === '' || str_starts_with($message, 'The route ')) {
            return 'Resource not found.';
        }

        return $message;
    }

    private function resolveHttpExceptionMessage(HttpExceptionInterface $e, int $status): string
    {
        if ($status >= 500 && ! config('app.debug') && $status !== Response::HTTP_SERVICE_UNAVAILABLE) {
            return 'An unexpected error occurred.';
        }

        $message = $e->getMessage();

        if ($message !== '') {
            return $message;
        }

        return match ($status) {
            Response::HTTP_BAD_REQUEST => 'Bad request.',
            Response::HTTP_UNAUTHORIZED => 'Unauthenticated.',
            Response::HTTP_FORBIDDEN => 'This action is unauthorized.',
            Response::HTTP_NOT_FOUND => 'Resource not found.',
            Response::HTTP_METHOD_NOT_ALLOWED => 'Method not allowed.',
            Response::HTTP_CONFLICT => 'Resource conflict.',
            419 => 'CSRF token mismatch.',
            Response::HTTP_TOO_MANY_REQUESTS => 'Too many requests. Please try again later.',
            Response::HTTP_SERVICE_UNAVAILABLE => 'Service unavailable.',
            default => Response::$statusTexts[$status] ?? 'An error occurred.',
        };
    }

    /**
     * @param  array<int|string, mixed>  $headers
     * @return array<string, string|array<int, string>>
     */
    private function normalizeHeaders(array $headers): array
    {
        $normalized = [];

        foreach ($headers as $name => $value) {
            if (! is_string($name)) {
                continue;
            }

            if (is_string($value) || is_int($value)) {
                $normalized[$name] = (string) $value;
            } elseif (is_array($value)) {
                $normalized[$name] = array_values(array_map(
                    static fn (mixed $item): string => is_scalar($item) ? (string) $item : '',
                    $value,
                ));
            }
        }

        return $normalized;
    }
}
