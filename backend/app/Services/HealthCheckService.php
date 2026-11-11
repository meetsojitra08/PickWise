<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Database\DatabaseManager;
use Throwable;

class HealthCheckService
{
    public function __construct(
        private readonly DatabaseManager $database,
    ) {}

    /**
     * Verify core backend dependencies are reachable for health monitoring.
     *
     * @return array{healthy: bool, checks: array{database: string}}
     */
    public function check(): array
    {
        $databaseOk = $this->checkDatabase();

        return [
            'healthy' => $databaseOk,
            'checks' => [
                'database' => $databaseOk ? 'ok' : 'error',
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
}
