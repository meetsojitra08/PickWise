<?php

declare(strict_types=1);

namespace App\Http\Responses;

use App\Enums\ApiErrorCode;
use App\Support\RequestId;
use Illuminate\Container\Container;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

final class ApiResponse
{
    /**
     * Build a standard single-payload success JSON response: { "data": ... }.
     *
     * @param  array<string, mixed>  $meta
     * @param  array<string, string|array<int, string>>  $headers
     */
    public static function success(
        mixed $data = null,
        int $status = 200,
        array $meta = [],
        array $headers = [],
    ): JsonResponse {
        $payload = ['data' => $data];

        if ($meta !== []) {
            $payload['meta'] = $meta;
        }

        return response()->json($payload, $status, $headers);
    }

    /**
     * Build a standard 201 Created JSON response.
     *
     * @param  array<string, string|array<int, string>>  $headers
     */
    public static function created(mixed $data = null, array $headers = []): JsonResponse
    {
        return self::success($data, Response::HTTP_CREATED, [], $headers);
    }

    /**
     * Build a standard message-only success JSON response inside the data envelope.
     *
     * @param  array<string, string|array<int, string>>  $headers
     */
    public static function message(
        string $message,
        int $status = Response::HTTP_OK,
        array $headers = [],
    ): JsonResponse {
        return self::success(['message' => $message], $status, [], $headers);
    }

    /**
     * Build a 204 No Content response.
     *
     * @param  array<string, string|array<int, string>>  $headers
     */
    public static function noContent(array $headers = []): Response
    {
        return response()->noContent(Response::HTTP_NO_CONTENT, $headers);
    }

    /**
     * Build the canonical API error envelope with code, message, optional details, and request_id.
     *
     * @param  array<string, string|array<int, string>>  $headers
     */
    public static function error(
        ApiErrorCode|string $code,
        string $message,
        int $status = Response::HTTP_BAD_REQUEST,
        mixed $details = null,
        ?Request $request = null,
        array $headers = [],
    ): JsonResponse {
        $errorCode = $code instanceof ApiErrorCode ? $code->value : $code;
        $requestId = self::resolveRequestId($request);

        $error = [
            'code' => $errorCode,
            'message' => $message,
        ];

        if ($details !== null && $details !== []) {
            $error['details'] = $details;
        }

        $error['request_id'] = $requestId;

        return response()->json(['error' => $error], $status, $headers);
    }

    private static function resolveRequestId(?Request $request): string
    {
        if ($request instanceof Request) {
            return RequestId::resolve($request);
        }

        $container = Container::getInstance();

        if ($container->bound('request')) {
            return RequestId::resolve($container->make('request'));
        }

        return RequestId::current() ?? (string) Str::uuid();
    }
}
