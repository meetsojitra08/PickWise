<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Http\Request;

final class AssistantSessionResolver
{
    /**
     * Allow only safe, bounded client session identifiers (UUIDs or alphanumeric tokens),
     * preventing control characters, unbounded strings, or "ip:" namespace spoofing.
     */
    private const string VALID_KEY_PATTERN = '/^[A-Za-z0-9._-]{8,128}$/';

    /**
     * Resolve a stable guest session identifier from a validated custom header, active session, or IP.
     */
    public function resolve(Request $request): string
    {
        $headerKey = $request->header('X-Session-Key');
        if (is_string($headerKey)) {
            $trimmed = trim($headerKey);
            if ($trimmed !== '' && preg_match(self::VALID_KEY_PATTERN, $trimmed) === 1) {
                return $trimmed;
            }
        }

        if ($request->hasSession() && $request->session()->getId() !== '') {
            return $request->session()->getId();
        }

        return 'ip:'.($request->ip() ?? 'unknown');
    }

    /**
     * Return the current resolved session key from the bound request container if present.
     */
    public function currentSessionKey(): string
    {
        /** @var Request $request */
        $request = request();

        return $this->resolve($request);
    }
}
