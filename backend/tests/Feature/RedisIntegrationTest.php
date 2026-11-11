<?php

declare(strict_types=1);

use Illuminate\Queue\RedisQueue;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Session;

test('phpredis extension is loaded and configured as client', function (): void {
    expect(extension_loaded('redis'))->toBeTrue()
        ->and(config('database.redis.client'))->toBe('phpredis');
});

test('env example sets redis for session queue and cache', function (): void {
    $envExample = file_get_contents(base_path('.env.example'));

    expect($envExample)->toBeString()
        ->toMatch('/^SESSION_DRIVER=redis$/m')
        ->toMatch('/^QUEUE_CONNECTION=redis$/m')
        ->toMatch('/^CACHE_STORE=redis$/m')
        ->toMatch('/^REDIS_CLIENT=phpredis$/m')
        ->toMatch('/^REDIS_HOST=redis$/m');
});

test('redis cache store reads and writes with ttl', function (): void {
    $store = Cache::store('redis');
    $key = 'pickwise:test:cache:'.bin2hex(random_bytes(8));

    try {
        expect($store->put($key, 'ok', 60))->toBeTrue()
            ->and($store->get($key))->toBe('ok');
    } finally {
        $store->forget($key);
    }

    expect($store->get($key))->toBeNull();
});

test('redis session driver reads and writes sessions', function (): void {
    $sessionId = 'test-session-'.bin2hex(random_bytes(8));

    $writer = Session::driver('redis');
    $writer->setId($sessionId);
    $writer->start();
    $writer->put('probe', 'pickwise');
    $writer->save();

    try {
        $reader = Session::driver('redis');
        $reader->setId($sessionId);
        $reader->start();

        expect($reader->get('probe'))->toBe('pickwise');
    } finally {
        $writer->getHandler()->destroy($sessionId);
    }
});

test('redis queue connection pushes and pops jobs', function (): void {
    $queue = Queue::connection('redis');
    expect($queue)->toBeInstanceOf(RedisQueue::class);

    $queueName = 'test-p0-s5-'.bin2hex(random_bytes(4));

    try {
        $queue->push('ProbeJob', ['step' => 'P0-S5'], $queueName);
        $job = $queue->pop($queueName);

        expect($job)->not->toBeNull()
            ->and($job->getName())->toBe('ProbeJob')
            ->and($job->payload()['data'])->toBe(['step' => 'P0-S5']);

        $job->delete();
    } finally {
        $queue->clear($queueName);
    }
});
