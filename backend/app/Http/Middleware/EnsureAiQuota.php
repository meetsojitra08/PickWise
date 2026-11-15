<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\AI\AiUsageLogger;
use App\Enums\AiFeature;
use App\Exceptions\AiQuotaExceededException;
use App\Services\AiQuotaService;
use Closure;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;

class EnsureAiQuota
{
    public function __construct(
        private readonly AiQuotaService $quota,
        private readonly AiUsageLogger $usageLogger,
    ) {}

    /**
     * Reject AI requests once the caller's daily quota is used up.
     *
     * This only checks the counter. The AI feature counts a successful call
     * with AiQuotaService::consume() after it receives a usable reply, so a
     * provider failure or fallback does not spend the shopper's quota.
     *
     * @param  Closure(Request): Response  $next
     *
     * @throws AiQuotaExceededException
     */
    public function handle(Request $request, Closure $next, string $feature = 'assistant'): Response
    {
        $resolvedFeature = AiFeature::tryFrom($feature);

        if ($resolvedFeature === null) {
            throw new InvalidArgumentException(sprintf('Unknown AI feature "%s" passed to ai-quota middleware.', $feature));
        }

        $quota = $this->quota->snapshot($request);

        if ($quota->remaining <= 0) {
            $this->usageLogger->rateLimited($request, $resolvedFeature);

            throw new AiQuotaExceededException(
                limit: $quota->limit,
                resetsAt: $quota->resetsAt,
                retryAfterSeconds: $this->quota->secondsUntilReset(),
            );
        }

        return $next($request);
    }
}
