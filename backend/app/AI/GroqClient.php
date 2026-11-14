<?php

declare(strict_types=1);

namespace App\AI;

use App\Enums\AiFailureReason;
use App\Exceptions\AiUnavailableException;
use Illuminate\Contracts\Config\Repository as ConfigRepository;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

final class GroqClient
{
    private const CHAT_COMPLETIONS_PATH = '/chat/completions';

    private const MAX_ATTEMPTS = 2;

    private const RETRY_DELAY_MICROSECONDS = 200_000;

    public function __construct(
        private readonly ConfigRepository $config,
    ) {}

    /**
     * Send a JSON-only chat completion request and return the decoded reply.
     *
     * Retries once after a connection, server, or parsing failure. Callers must
     * still validate the reply shape and every product id it contains.
     *
     * @return array<string, mixed>
     *
     * @throws AiUnavailableException
     */
    public function completeJson(string $systemPrompt, string $userPrompt): array
    {
        $settings = $this->settings();
        $payload = [
            'model' => $settings['model'],
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userPrompt],
            ],
            'response_format' => ['type' => 'json_object'],
            'temperature' => 0.2,
        ];

        $reason = AiFailureReason::Connection;
        $previous = null;

        for ($attempt = 1; $attempt <= self::MAX_ATTEMPTS; $attempt++) {
            if ($attempt > 1) {
                usleep(self::RETRY_DELAY_MICROSECONDS);
            }

            try {
                $response = Http::withToken($settings['api_key'])
                    ->acceptJson()
                    ->asJson()
                    ->timeout($settings['timeout_seconds'])
                    ->post($settings['endpoint'], $payload);
            } catch (ConnectionException $exception) {
                $reason = AiFailureReason::Connection;
                $previous = $exception;

                continue;
            }

            if ($response->failed()) {
                $reason = AiFailureReason::HttpError;
                $previous = new RuntimeException(sprintf('Groq returned HTTP %d.', $response->status()));

                // A client error such as an invalid key will not improve on retry.
                if ($response->clientError() && $response->status() !== 429) {
                    break;
                }

                continue;
            }

            $content = $response->json('choices.0.message.content');

            if (! is_string($content)) {
                $reason = AiFailureReason::InvalidJson;

                continue;
            }

            $decoded = $this->decode($content);

            if ($decoded !== null) {
                return $decoded;
            }

            $reason = AiFailureReason::InvalidJson;
        }

        throw new AiUnavailableException($reason, previous: $previous);
    }

    /**
     * @return array{api_key: string, endpoint: string, model: string, timeout_seconds: int}
     */
    private function settings(): array
    {
        $apiKey = $this->config->get('ai.groq.api_key');
        $baseUrl = $this->config->get('ai.groq.base_url');
        $model = $this->config->get('ai.groq.model');
        $timeout = $this->config->get('ai.groq.timeout_seconds');

        if (
            ! is_string($apiKey) || trim($apiKey) === ''
            || ! is_string($model) || trim($model) === ''
        ) {
            throw AiUnavailableException::notConfigured();
        }

        $baseUrl = is_string($baseUrl) && trim($baseUrl) !== ''
            ? rtrim($baseUrl, '/')
            : 'https://api.groq.com/openai/v1';

        return [
            'api_key' => $apiKey,
            'endpoint' => $baseUrl.self::CHAT_COMPLETIONS_PATH,
            'model' => $model,
            'timeout_seconds' => is_int($timeout) && $timeout > 0 ? $timeout : 20,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function decode(string $content): ?array
    {
        try {
            $decoded = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            return null;
        }

        return is_array($decoded) ? $decoded : null;
    }
}
