<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Database\DatabaseManager;
use Mockery\MockInterface;
use RuntimeException;
use Tests\TestCase;

class HealthEndpointTest extends TestCase
{
    public function test_built_in_up_endpoint_returns_ok(): void
    {
        $this->get('/up')->assertOk();
    }

    public function test_api_health_endpoint_returns_ok_when_database_is_reachable(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertExactJson([
                'data' => [
                    'status' => 'ok',
                    'database' => 'ok',
                ],
            ]);
    }

    public function test_api_health_endpoint_returns_503_when_database_is_unreachable(): void
    {
        $this->mock(DatabaseManager::class, function (MockInterface $mock): void {
            $mock->shouldReceive('connection')
                ->once()
                ->andThrow(new RuntimeException('Connection refused'));
        });

        $this->getJson('/api/v1/health')
            ->assertStatus(503)
            ->assertExactJson([
                'error' => [
                    'code' => 'service_unavailable',
                    'message' => 'One or more dependencies are unavailable.',
                    'details' => [
                        'database' => 'error',
                    ],
                ],
            ]);
    }
}
