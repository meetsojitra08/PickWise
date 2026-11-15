<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Http\Request;

final class AssistantSessionResolver
{
    /**
     * Resolve a stable guest session identifier from the active session, custom header, or IP.
     */
    public function resolve(Request $request): string
    {
        $headerKey = $request->header('X-Session-Key');
        if (is_string($headerKey) && trim($headerKey) !== '') {
            return trim($headerKey);
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
