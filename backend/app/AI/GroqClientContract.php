<?php

declare(strict_types=1);

namespace App\AI;

use App\Exceptions\AiUnavailableException;

interface GroqClientContract
{
    /**
     * Send a JSON-only chat completion request and return the decoded reply.
     *
     * Implementations must throw AiUnavailableException instead of returning
     * a partial reply, so callers only ever see a decoded array or a failure.
     *
     * @return array<string, mixed>
     *
     * @throws AiUnavailableException
     */
    public function completeJson(string $systemPrompt, string $userPrompt): array;
}
