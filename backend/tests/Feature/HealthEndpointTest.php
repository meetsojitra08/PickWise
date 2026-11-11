<?php

declare(strict_types=1);

use Illuminate\Database\DatabaseManager;
use Illuminate\Redis\Connections\Connection as RedisConnection;
use Illuminate\Redis\RedisManager;
use Mockery\MockInterface;

test('built in up endpoint returns ok', function (): void {
    $this->get('/up')->assertOk();
});

test('api health endpoint returns ok when dependencies are reachable', function (): void {
    $this->getJson('/api/v1/health')
        ->assertOk()
        ->assertExactJson([
            'data' => [
                'status' => 'ok',
                'database' => 'ok',
                'redis' => 'ok',
            ],
        ]);
});

test('api health endpoint returns 503 when database is unreachable', function (): void {
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
});

test('api health endpoint returns 503 when redis is unreachable', function (): void {
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
});

test('api health endpoint returns 503 when redis ping returns false', function (): void {
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
});

test('api health endpoint returns 503 when both dependencies are unreachable', function (): void {
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
});
