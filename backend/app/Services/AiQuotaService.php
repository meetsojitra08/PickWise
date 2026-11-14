<?php

declare(strict_types=1);

namespace App\Services;

use App\Data\Assistant\AiQuota;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Contracts\Config\Repository as ConfigRepository;
use Illuminate\Http\Request;

final class AiQuotaService
{
    private const CACHE_PREFIX = 'pickwise:ai:quota';

    public function __construct(
        private readonly CacheRepository $cache,
        private readonly ConfigRepository $config,
    ) {}

    /**
     * Read today's counter without changing it.
     */
    public function snapshot(Request $request): AiQuota
    {
        $limit = $this->limitFor($request);
        $used = $this->usedBy($request);

        return new AiQuota(
            limit: $limit,
            used: $used,
            remaining: max(0, $limit - $used),
            resetsAt: $this->resetsAt(),
        );
    }

    /**
     * Count one successful AI call and return today's new total.
     *
     * The key expires at midnight, so Redis missing or being cleared simply
     * starts the count again instead of losing durable data.
     */
    public function consume(Request $request): int
    {
        $key = $this->keyFor($request);

        $this->cache->add($key, 0, $this->secondsUntilReset());

        return (int) $this->cache->increment($key);
    }

    private function usedBy(Request $request): int
    {
        $used = $this->cache->get($this->keyFor($request), 0);

        return is_numeric($used) ? (int) $used : 0;
    }

    private function limitFor(Request $request): int
    {
        $key = $request->user() instanceof User
            ? 'ai.daily_quota.user'
            : 'ai.daily_quota.guest';

        $limit = $this->config->get($key);

        return is_numeric($limit) ? max(0, (int) $limit) : 0;
    }

    private function resetsAt(): CarbonImmutable
    {
        return CarbonImmutable::now('UTC')->addDay()->startOfDay();
    }

    public function secondsUntilReset(): int
    {
        return max(1, (int) ceil(CarbonImmutable::now('UTC')->diffInSeconds($this->resetsAt(), true)));
    }

    /**
     * Customers are counted by user id; guests by session id, or by IP when no
     * session is available (for example a stateless API request).
     */
    private function keyFor(Request $request): string
    {
        return sprintf(
            '%s:%s:%s',
            self::CACHE_PREFIX,
            $this->identityFor($request),
            CarbonImmutable::now('UTC')->toDateString(),
        );
    }

    private function identityFor(Request $request): string
    {
        $user = $request->user();

        if ($user instanceof User) {
            return 'user:'.$user->getAuthIdentifier();
        }

        if ($request->hasSession()) {
            return 'session:'.$request->session()->getId();
        }

        return 'ip:'.($request->ip() ?? 'unknown');
    }
}
