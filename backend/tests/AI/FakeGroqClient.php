<?php

declare(strict_types=1);

namespace Tests\AI;

use App\AI\GroqClientContract;
use App\Enums\AiFailureReason;
use App\Exceptions\AiUnavailableException;
use LogicException;

/**
 * Prepared stand-in for the Groq client so AI services can be tested without
 * HTTP. Queue replies with willReturn(), or simulate a broken client with
 * willFail() (timeout, server error, invalid JSON).
 */
final class FakeGroqClient implements GroqClientContract
{
    /** @var list<array<string, mixed>> */
    private array $replies = [];

    private ?AiFailureReason $failure = null;

    /** @var list<array{system: string, user: string}> */
    private array $calls = [];

    /**
     * @param  array<string, mixed>  $reply
     */
    public function willReturn(array $reply): self
    {
        $this->replies[] = $reply;

        return $this;
    }

    /**
     * Make every call fail the way the real client would when Groq times out,
     * returns an error, or replies with invalid JSON.
     */
    public function willFail(AiFailureReason $reason = AiFailureReason::Connection): self
    {
        $this->failure = $reason;

        return $this;
    }

    /**
     * @return array<string, mixed>
     */
    public function completeJson(string $systemPrompt, string $userPrompt): array
    {
        $this->calls[] = ['system' => $systemPrompt, 'user' => $userPrompt];

        if ($this->failure !== null) {
            throw new AiUnavailableException($this->failure);
        }

        if ($this->replies === []) {
            throw new LogicException('FakeGroqClient has no reply queued. Call willReturn() first.');
        }

        return array_shift($this->replies);
    }

    /**
     * @return list<array{system: string, user: string}>
     */
    public function calls(): array
    {
        return $this->calls;
    }

    public function lastUserPrompt(): ?string
    {
        $last = end($this->calls);

        return $last === false ? null : $last['user'];
    }
}
