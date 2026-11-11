<?php

declare(strict_types=1);

use App\Enums\ApiErrorCode;
use App\Exceptions\ApiException;
use App\Http\Responses\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Log\Events\MessageLogged;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

test('single json resource and api response helpers return standard data envelope', function (): void {
    Route::get('/api/v1/_test/single-resource', function (): JsonResource {
        return new class(['id' => 14, 'name' => 'ThinkPad X1']) extends JsonResource
        {
            /** @return array{id: int, name: string} */
            public function toArray(Request $request): array
            {
                return [
                    'id' => $this->resource['id'],
                    'name' => $this->resource['name'],
                ];
            }
        };
    });

    Route::post('/api/v1/_test/created', fn () => ApiResponse::created(['id' => 99]));
    Route::post('/api/v1/_test/message', fn () => ApiResponse::message('Logged out.'));
    Route::delete('/api/v1/_test/deleted', fn () => ApiResponse::noContent());

    $this->getJson('/api/v1/_test/single-resource')
        ->assertOk()
        ->assertHeader('X-Request-Id')
        ->assertExactJson([
            'data' => [
                'id' => 14,
                'name' => 'ThinkPad X1',
            ],
        ]);

    $this->postJson('/api/v1/_test/created')
        ->assertCreated()
        ->assertExactJson(['data' => ['id' => 99]]);

    $this->postJson('/api/v1/_test/message')
        ->assertOk()
        ->assertExactJson(['data' => ['message' => 'Logged out.']]);

    $this->deleteJson('/api/v1/_test/deleted')
        ->assertNoContent()
        ->assertHeader('X-Request-Id');
});

test('paginated json resource collection returns data, meta, and links', function (): void {
    Route::get('/api/v1/_test/collection', function (): JsonResource {
        $paginator = new LengthAwarePaginator(
            items: [
                ['id' => 1, 'name' => 'Alpha'],
                ['id' => 2, 'name' => 'Beta'],
            ],
            total: 5,
            perPage: 2,
            currentPage: 1,
            options: ['path' => url('/api/v1/_test/collection')],
        );

        return JsonResource::collection($paginator);
    });

    $this->getJson('/api/v1/_test/collection')
        ->assertOk()
        ->assertJsonPath('data.0.id', 1)
        ->assertJsonPath('data.1.name', 'Beta')
        ->assertJsonPath('meta.current_page', 1)
        ->assertJsonPath('meta.per_page', 2)
        ->assertJsonPath('meta.total', 5)
        ->assertJsonPath('meta.last_page', 3)
        ->assertJsonStructure([
            'data' => [['id', 'name']],
            'meta' => ['current_page', 'per_page', 'total', 'last_page'],
            'links' => ['first', 'last', 'prev', 'next'],
        ]);
});

test('request id middleware echoes valid inbound header and replaces unsafe values', function (): void {
    $valid = $this->withHeader('X-Request-Id', 'req_trace-123.abc')
        ->getJson('/api/v1/health');

    $valid->assertHeader('X-Request-Id', 'req_trace-123.abc');

    $unsafe = $this->withHeader('X-Request-Id', "bad header\r\ninjection")
        ->getJson('/api/v1/health');

    $generatedId = (string) $unsafe->headers->get('X-Request-Id');
    expect($generatedId)->not->toContain('bad header')
        ->and(Str::isUuid($generatedId))->toBeTrue();

    $second = $this->getJson('/api/v1/health');
    $secondId = (string) $second->headers->get('X-Request-Id');
    expect(Str::isUuid($secondId))->toBeTrue()
        ->and($secondId)->not->toBe($generatedId);
});

test('validation exception renders 422 validation_failed envelope', function (): void {
    Route::post('/api/v1/_test/validate', function (): void {
        throw ValidationException::withMessages([
            'email' => ['The email has already been taken.'],
        ]);
    });

    $this->withHeader('X-Request-Id', 'req-val-422')
        ->post('/api/v1/_test/validate')
        ->assertStatus(422)
        ->assertHeader('X-Request-Id', 'req-val-422')
        ->assertExactJson([
            'error' => [
                'code' => 'validation_failed',
                'message' => 'The email has already been taken.',
                'details' => [
                    'email' => ['The email has already been taken.'],
                ],
                'request_id' => 'req-val-422',
            ],
        ]);
});

test('authentication and authorization exceptions render standard 401 and 403 envelopes', function (): void {
    Route::get('/api/v1/_test/unauthenticated', function (): void {
        throw new AuthenticationException;
    });

    Route::get('/api/v1/_test/forbidden', function (): void {
        throw new AuthorizationException('Admins only.');
    });

    $this->withHeader('X-Request-Id', 'req-auth-401')
        ->get('/api/v1/_test/unauthenticated')
        ->assertUnauthorized()
        ->assertExactJson([
            'error' => [
                'code' => 'unauthenticated',
                'message' => 'Unauthenticated.',
                'request_id' => 'req-auth-401',
            ],
        ]);

    $this->withHeader('X-Request-Id', 'req-auth-403')
        ->get('/api/v1/_test/forbidden')
        ->assertForbidden()
        ->assertExactJson([
            'error' => [
                'code' => 'forbidden',
                'message' => 'Admins only.',
                'request_id' => 'req-auth-403',
            ],
        ]);
});

test('missing api route and model not found render 404 without leaking internal details', function (): void {
    Route::get('/api/v1/_test/missing-model', function (): void {
        throw (new ModelNotFoundException)->setModel('App\\Models\\SecretInternalModel', [42]);
    });

    $unmatched = $this->withHeader('X-Request-Id', 'req-404-route')
        ->get('/api/v1/does-not-exist-anywhere');

    $unmatched->assertNotFound()
        ->assertHeader('X-Request-Id', 'req-404-route')
        ->assertExactJson([
            'error' => [
                'code' => 'not_found',
                'message' => 'Resource not found.',
                'request_id' => 'req-404-route',
            ],
        ]);

    $modelMissing = $this->withHeader('X-Request-Id', 'req-404-model')
        ->get('/api/v1/_test/missing-model');

    $modelMissing->assertNotFound()
        ->assertExactJson([
            'error' => [
                'code' => 'not_found',
                'message' => 'Resource not found.',
                'request_id' => 'req-404-model',
            ],
        ]);

    expect($modelMissing->getContent())->not->toContain('SecretInternalModel');
});

test('method not allowed and throttle exceptions preserve headers and use standard envelope', function (): void {
    Route::get('/api/v1/_test/throttled', function (): void {
        throw new ThrottleRequestsException('Too many attempts.', headers: ['Retry-After' => '45']);
    });

    $this->withHeader('X-Request-Id', 'req-405')
        ->postJson('/api/v1/health')
        ->assertStatus(405)
        ->assertHeader('Allow')
        ->assertJsonPath('error.code', 'method_not_allowed')
        ->assertJsonPath('error.request_id', 'req-405');

    $this->withHeader('X-Request-Id', 'req-429')
        ->getJson('/api/v1/_test/throttled')
        ->assertStatus(429)
        ->assertHeader('Retry-After', '45')
        ->assertExactJson([
            'error' => [
                'code' => 'rate_limited',
                'message' => 'Too many attempts.',
                'request_id' => 'req-429',
            ],
        ]);
});

test('api exceptions render custom codes and only report server errors', function (): void {
    Route::get('/api/v1/_test/ai-quota', function (): void {
        throw new ApiException(
            errorCode: ApiErrorCode::AiQuotaExceeded,
            message: 'Daily AI limit reached.',
            statusCode: 429,
            headers: ['Retry-After' => '3600'],
        );
    });

    Route::get('/api/v1/_test/ai-down', function (): void {
        throw new ApiException(
            errorCode: ApiErrorCode::AiUnavailable,
            message: 'The assistant is temporarily unavailable.',
            statusCode: 503,
        );
    });

    $handler = app(ExceptionHandler::class);

    expect($handler->shouldReport(new ApiException(ApiErrorCode::AiQuotaExceeded, 'Limit', 429)))->toBeFalse()
        ->and($handler->shouldReport(new ApiException(ApiErrorCode::AiUnavailable, 'Down', 503)))->toBeTrue();

    $this->withHeader('X-Request-Id', 'req-ai-429')
        ->getJson('/api/v1/_test/ai-quota')
        ->assertStatus(429)
        ->assertHeader('Retry-After', '3600')
        ->assertExactJson([
            'error' => [
                'code' => 'ai_quota_exceeded',
                'message' => 'Daily AI limit reached.',
                'request_id' => 'req-ai-429',
            ],
        ]);

    $this->withHeader('X-Request-Id', 'req-ai-503')
        ->getJson('/api/v1/_test/ai-down')
        ->assertStatus(503)
        ->assertExactJson([
            'error' => [
                'code' => 'ai_unavailable',
                'message' => 'The assistant is temporarily unavailable.',
                'request_id' => 'req-ai-503',
            ],
        ]);
});

test('unexpected exceptions hide traces in production mode and log request_id', function (): void {
    Route::get('/api/v1/_test/crash', function (): void {
        throw new RuntimeException('SQLSTATE sensitive credential error');
    });

    $loggedEvents = [];
    Log::listen(function (MessageLogged $event) use (&$loggedEvents): void {
        $loggedEvents[] = $event;
    });

    config(['app.debug' => false]);

    $prodResponse = $this->withHeader('X-Request-Id', 'req-500-prod')
        ->get('/api/v1/_test/crash');

    $prodResponse->assertStatus(500)
        ->assertHeader('X-Request-Id', 'req-500-prod')
        ->assertExactJson([
            'error' => [
                'code' => 'internal_error',
                'message' => 'An unexpected error occurred.',
                'request_id' => 'req-500-prod',
            ],
        ]);

    expect($prodResponse->getContent())->not->toContain('SQLSTATE')
        ->and($prodResponse->getContent())->not->toContain('RuntimeException')
        ->and($loggedEvents)->not->toBeEmpty();

    $lastLog = end($loggedEvents);
    expect($lastLog)->toBeInstanceOf(MessageLogged::class)
        ->and($lastLog->context['request_id'] ?? null)->toBe('req-500-prod');

    config(['app.debug' => true]);

    $debugResponse = $this->withHeader('X-Request-Id', 'req-500-debug')
        ->getJson('/api/v1/_test/crash');

    $debugResponse->assertStatus(500)
        ->assertJsonPath('error.code', 'internal_error')
        ->assertJsonPath('error.message', 'An unexpected error occurred.')
        ->assertJsonPath('error.request_id', 'req-500-debug')
        ->assertJsonPath('error.details.exception', RuntimeException::class)
        ->assertJsonPath('error.details.message', 'SQLSTATE sensitive credential error');
});

test('non-api web routes do not render api json envelope unless json is requested', function (): void {
    $htmlResponse = $this->get('/non-existent-web-page');

    $htmlResponse->assertNotFound()
        ->assertHeader('X-Request-Id');

    expect($htmlResponse->headers->get('Content-Type'))->not->toContain('application/json');

    $jsonResponse = $this->withHeader('X-Request-Id', 'req-accept-json')
        ->getJson('/non-existent-web-page');

    $jsonResponse->assertNotFound()
        ->assertExactJson([
            'error' => [
                'code' => 'not_found',
                'message' => 'Resource not found.',
                'request_id' => 'req-accept-json',
            ],
        ]);
});
