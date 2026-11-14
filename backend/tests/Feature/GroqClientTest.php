<?php

declare(strict_types=1);

use App\AI\GroqClient;
use App\Enums\AiFailureReason;
use App\Enums\ApiErrorCode;
use App\Exceptions\AiUnavailableException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    config()->set('ai.groq', [
        'api_key' => 'test-key',
        'base_url' => 'https://api.groq.test/openai/v1',
        'model' => 'test-model',
        'timeout_seconds' => 20,
    ]);
});

test('sends a json only chat completion and returns the decoded reply', function (): void {
    Http::fake([
        'api.groq.test/*' => Http::response([
            'choices' => [
                [
                    'message' => [
                        'role' => 'assistant',
                        'content' => '{"message":"Here are two laptops.","recommendations":[]}',
                    ],
                ],
            ],
        ]),
    ]);

    $reply = app(GroqClient::class)->completeJson(
        'You are a shopping assistant. Reply with JSON only.',
        'Find a laptop for video editing.',
    );

    expect($reply)->toBe([
        'message' => 'Here are two laptops.',
        'recommendations' => [],
    ]);

    Http::assertSent(function (Request $request): bool {
        $data = $request->data();

        return $request->url() === 'https://api.groq.test/openai/v1/chat/completions'
            && $request->method() === 'POST'
            && $request->header('Authorization') === ['Bearer test-key']
            && $data['model'] === 'test-model'
            && $data['response_format'] === ['type' => 'json_object']
            && $data['messages'][0]['role'] === 'system'
            && $data['messages'][0]['content'] === 'You are a shopping assistant. Reply with JSON only.'
            && $data['messages'][1]['content'] === 'Find a laptop for video editing.';
    });
});

test('retries once after a server error and returns the second reply', function (): void {
    Http::fake([
        'api.groq.test/*' => Http::sequence()
            ->push(['error' => ['message' => 'upstream down']], 503)
            ->push([
                'choices' => [
                    ['message' => ['content' => '{"message":"Recovered."}']],
                ],
            ], 200),
    ]);

    $reply = app(GroqClient::class)->completeJson('Reply with JSON only.', 'Hello');

    expect($reply)->toBe(['message' => 'Recovered.']);
    Http::assertSentCount(2);
});

test('throws a clear exception after two server errors', function (): void {
    Http::fake([
        'api.groq.test/*' => Http::response(['error' => ['message' => 'upstream down']], 500),
    ]);

    expect(fn () => app(GroqClient::class)->completeJson('Reply with JSON only.', 'Hello'))
        ->toThrow(function (AiUnavailableException $exception): void {
            expect($exception->reason)->toBe(AiFailureReason::HttpError)
                ->and($exception->errorCode)->toBe(ApiErrorCode::AiUnavailable)
                ->and($exception->statusCode)->toBe(503);
        });

    Http::assertSentCount(2);
});

test('does not retry a client error from groq', function (): void {
    Http::fake([
        'api.groq.test/*' => Http::response(['error' => ['message' => 'invalid api key']], 401),
    ]);

    expect(fn () => app(GroqClient::class)->completeJson('Reply with JSON only.', 'Hello'))
        ->toThrow(function (AiUnavailableException $exception): void {
            expect($exception->reason)->toBe(AiFailureReason::HttpError);
        });

    Http::assertSentCount(1);
});

test('treats a non json reply as a failure and retries once', function (): void {
    Http::fake([
        'api.groq.test/*' => Http::response([
            'choices' => [['message' => ['content' => 'This is not JSON.']]],
        ]),
    ]);

    expect(fn () => app(GroqClient::class)->completeJson('Reply with JSON only.', 'Hello'))
        ->toThrow(function (AiUnavailableException $exception): void {
            expect($exception->reason)->toBe(AiFailureReason::InvalidJson)
                ->and($exception->statusCode)->toBe(503);
        });

    Http::assertSentCount(2);
});

test('retries a connection failure and then throws', function (): void {
    $attempts = 0;

    Http::fake(function () use (&$attempts): never {
        $attempts++;

        throw new ConnectionException('Connection timed out.');
    });

    expect(fn () => app(GroqClient::class)->completeJson('Reply with JSON only.', 'Hello'))
        ->toThrow(function (AiUnavailableException $exception): void {
            expect($exception->reason)->toBe(AiFailureReason::Connection);
        });

    expect($attempts)->toBe(2);
    Http::assertNothingSent();
});

test('throws before calling groq when the client is not configured', function (): void {
    config()->set('ai.groq.model', null);

    Http::fake();

    expect(fn () => app(GroqClient::class)->completeJson('Reply with JSON only.', 'Hello'))
        ->toThrow(function (AiUnavailableException $exception): void {
            expect($exception->reason)->toBe(AiFailureReason::NotConfigured);
        });

    Http::assertNothingSent();
});

test('env example documents groq settings and daily quotas', function (): void {
    $envExample = file_get_contents(base_path('.env.example'));

    expect($envExample)->toBeString()
        ->toMatch('/^GROQ_API_KEY=$/m')
        ->toMatch('/^GROQ_BASE_URL=https:\/\/api\.groq\.com\/openai\/v1$/m')
        ->toMatch('/^GROQ_MODEL=$/m')
        ->toMatch('/^GROQ_TIMEOUT_SECONDS=20$/m')
        ->toMatch('/^AI_DAILY_QUOTA_USER=30$/m')
        ->toMatch('/^AI_DAILY_QUOTA_GUEST=5$/m');
});
