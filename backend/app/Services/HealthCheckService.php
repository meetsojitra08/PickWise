<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Database\DatabaseManager;
use Illuminate\Redis\RedisManager;
use Throwable;

class HealthCheckService
{
    public function __construct(
        private readonly DatabaseManager $database,
        private readonly RedisManager $redis,
    ) {}

    /**
     * Verify core backend dependencies are reachable for health monitoring.
     *
     * @return array{healthy: bool, checks: array{database: string, redis: string}}
     */
    public function check(): array
    {
        $databaseOk = $this->checkDatabase();
        $redisOk = $this->checkRedis();

        return [
            'healthy' => $databaseOk && $redisOk,
            'checks' => [
                'database' => $databaseOk ? 'ok' : 'error',
                'redis' => $redisOk ? 'ok' : 'error',
            ],
        ];
    }

    private function checkDatabase(): bool
    {
        try {
            $this->database->connection()->select('SELECT 1');

            return true;
        } catch (Throwable) {
            return false;
        }
    }

    private function checkRedis(): bool
    {
        try {
            $response = $this->redis->connection()->command('ping');

            return in_array($response, [true, '+PONG', 'PONG'], true);
        } catch (Throwable) {
            return false;
        }
    }
}
