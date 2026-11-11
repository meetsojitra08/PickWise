<?php

declare(strict_types=1);

use Illuminate\Database\DatabaseManager;
use Illuminate\Redis\Connections\Connection as RedisConnection;
use Illuminate\Redis\RedisManager;
use Illuminate\Support\Str;
use Mockery\MockInterface;

test('built in up endpoint returns ok', function (): void {
    $this->get('/up')->assertOk();
});

test('api health endpoint returns ok when dependencies are reachable', function (): void {
    $response = $this->getJson('/api/v1/health');

    $response->assertOk()
        ->assertHeader('X-Request-Id')
        ->assertExactJson([
            'data' => [
                'status' => 'ok',
                'database' => 'ok',
                'redis' => 'ok',
            ],
        ]);

    expect(Str::isUuid((string) $response->headers->get('X-Request-Id')))->toBeTrue();
});

test('api health endpoint returns 503 when database is unreachable', function (): void {
    $this->mock(DatabaseManager::class, function (MockInterface $mock): void {
        $mock->shouldReceive('connection')
            ->once()
            ->andThrow(new RuntimeException('Connection refused'));
    });

    $response = $this->getJson('/api/v1/health');
    $requestId = (string) $response->headers->get('X-Request-Id');

    expect(Str::isUuid($requestId))->toBeTrue();

    $response->assertStatus(503)
        ->assertExactJson([
            'error' => [
                'code' => 'service_unavailable',
                'message' => 'One or more dependencies are unavailable.',
                'details' => [
                    'database' => 'error',
                    'redis' => 'ok',
                ],
                'request_id' => $requestId,
            ],
        ]);
});

test('api health endpoint returns 503 when redis is unreachable', function (): void {
    $this->mock(RedisManager::class, function (MockInterface $mock): void {
        $mock->shouldReceive('connection')
            ->once()
            ->andThrow(new RuntimeException('Redis connection refused'));
    });

    $this->withHeader('X-Request-Id', 'health-redis-503')
        ->getJson('/api/v1/health')
        ->assertStatus(503)
        ->assertHeader('X-Request-Id', 'health-redis-503')
        ->assertExactJson([
            'error' => [
                'code' => 'service_unavailable',
                'message' => 'One or more dependencies are unavailable.',
                'details' => [
                    'database' => 'ok',
                    'redis' => 'error',
                ],
                'request_id' => 'health-redis-503',
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

    $this->withHeader('X-Request-Id', 'health-ping-false')
        ->getJson('/api/v1/health')
        ->assertStatus(503)
        ->assertHeader('X-Request-Id', 'health-ping-false')
        ->assertExactJson([
            'error' => [
                'code' => 'service_unavailable',
                'message' => 'One or more dependencies are unavailable.',
                'details' => [
                    'database' => 'ok',
                    'redis' => 'error',
                ],
                'request_id' => 'health-ping-false',
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

    $this->withHeader('X-Request-Id', 'health-both-down')
        ->getJson('/api/v1/health')
        ->assertStatus(503)
        ->assertHeader('X-Request-Id', 'health-both-down')
        ->assertExactJson([
            'error' => [
                'code' => 'service_unavailable',
                'message' => 'One or more dependencies are unavailable.',
                'details' => [
                    'database' => 'error',
                    'redis' => 'error',
                ],
                'request_id' => 'health-both-down',
            ],
        ]);
});
