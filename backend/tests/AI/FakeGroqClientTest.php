<?php

declare(strict_types=1);

use App\AI\GroqClient;
use App\AI\GroqClientContract;
use App\Enums\AiFailureReason;
use App\Enums\ApiErrorCode;
use App\Exceptions\AiUnavailableException;
use Tests\AI\FakeGroqClient;

test('returns queued replies in order and records the prompts', function (): void {
    $fake = new FakeGroqClient;

    $fake->willReturn(['message' => 'First reply.'])
        ->willReturn(['message' => 'Second reply.']);

    expect($fake->completeJson('System A', 'User A'))->toBe(['message' => 'First reply.'])
        ->and($fake->completeJson('System B', 'User B'))->toBe(['message' => 'Second reply.'])
        ->and($fake->calls())->toBe([
            ['system' => 'System A', 'user' => 'User A'],
            ['system' => 'System B', 'user' => 'User B'],
        ])
        ->and($fake->lastUserPrompt())->toBe('User B');
});

test('throws the prepared failure reason on every call', function (): void {
    $fake = (new FakeGroqClient)->willFail(AiFailureReason::InvalidJson);

    expect(fn () => $fake->completeJson('System', 'User'))
        ->toThrow(function (AiUnavailableException $exception): void {
            expect($exception->reason)->toBe(AiFailureReason::InvalidJson)
                ->and($exception->errorCode)->toBe(ApiErrorCode::AiUnavailable)
                ->and($exception->statusCode)->toBe(503);
        });

    expect(fn () => $fake->completeJson('System', 'User'))
        ->toThrow(AiUnavailableException::class);
});

test('fails loudly when no reply was queued', function (): void {
    $fake = new FakeGroqClient;

    expect(fn () => $fake->completeJson('System', 'User'))
        ->toThrow(LogicException::class, 'FakeGroqClient has no reply queued.');
});

test('binds the real client to the contract by default', function (): void {
    expect(app(GroqClientContract::class))->toBeInstanceOf(GroqClient::class);
});

test('swaps the fake into the container when requested', function (): void {
    $fake = fakeGroqClient()->willReturn(['message' => 'Faked.']);

    expect(app(GroqClientContract::class))->toBe($fake)
        ->and(app(GroqClientContract::class)->completeJson('System', 'User'))
        ->toBe(['message' => 'Faked.']);
});
