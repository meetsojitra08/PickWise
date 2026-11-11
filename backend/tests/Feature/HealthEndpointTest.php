<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Database\DatabaseManager;
use Illuminate\Redis\Connections\Connection as RedisConnection;
use Illuminate\Redis\RedisManager;
use Mockery;
use Mockery\MockInterface;
use RuntimeException;
use Tests\TestCase;

class HealthEndpointTest extends TestCase
{
    public function test_built_in_up_endpoint_returns_ok(): void
    {
        $this->get('/up')->assertOk();
    }

    public function test_api_health_endpoint_returns_ok_when_dependencies_are_reachable(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertExactJson([
                'data' => [
                    'status' => 'ok',
                    'database' => 'ok',
                    'redis' => 'ok',
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
                        'redis' => 'ok',
                    ],
                ],
            ]);
    }

    public function test_api_health_endpoint_returns_503_when_redis_is_unreachable(): void
    {
        $this->mock(RedisManager::class, function (MockInterface $mock): void {
            $mock->shouldReceive('connection')
                ->once()
                ->andThrow(new RuntimeException('Redis connection refused'));
        });

        $this->getJson('/api/v1/health')
            ->assertStatus(503)
            ->assertExactJson([
                'error' => [
                    'code' => 'service_unavailable',
                    'message' => 'One or more dependencies are unavailable.',
                    'details' => [
                        'database' => 'ok',
                        'redis' => 'error',
                    ],
                ],
            ]);
    }

    public function test_api_health_endpoint_returns_503_when_redis_ping_returns_false(): void
    {
        $connection = Mockery::mock(RedisConnection::class);
        $connection->shouldReceive('command')
            ->once()
            ->with('ping')
            ->andReturn(false);

        $this->mock(RedisManager::class, function (MockInterface $mock) use ($connection): void {
            $mock->shouldReceive('connection')
                ->once()
                ->andReturn($connection);
        });

        $this->getJson('/api/v1/health')
            ->assertStatus(503)
            ->assertExactJson([
                'error' => [
                    'code' => 'service_unavailable',
                    'message' => 'One or more dependencies are unavailable.',
                    'details' => [
                        'database' => 'ok',
                        'redis' => 'error',
                    ],
                ],
            ]);
    }

    public function test_api_health_endpoint_returns_503_when_both_dependencies_are_unreachable(): void
    {
        $this->mock(DatabaseManager::class, function (MockInterface $mock): void {
            $mock->shouldReceive('connection')
                ->once()
                ->andThrow(new RuntimeException('Database connection refused'));
        });

        $this->mock(RedisManager::class, function (MockInterface $mock): void {
            $mock->shouldReceive('connection')
                ->once()
                ->andThrow(new RuntimeException('Redis connection refused'));
        });

        $this->getJson('/api/v1/health')
            ->assertStatus(503)
            ->assertExactJson([
                'error' => [
                    'code' => 'service_unavailable',
                    'message' => 'One or more dependencies are unavailable.',
                    'details' => [
                        'database' => 'error',
                        'redis' => 'error',
                    ],
                ],
            ]);
    }
}
