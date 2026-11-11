<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Queue\RedisQueue;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Session;
use Tests\TestCase;

class RedisIntegrationTest extends TestCase
{
    public function test_phpredis_extension_is_loaded_and_configured_as_client(): void
    {
        $this->assertTrue(extension_loaded('redis'));
        $this->assertSame('phpredis', config('database.redis.client'));
    }

    public function test_env_example_sets_redis_for_session_queue_and_cache(): void
    {
        $envExample = file_get_contents(base_path('.env.example'));
        $this->assertIsString($envExample);

        $this->assertMatchesRegularExpression('/^SESSION_DRIVER=redis$/m', $envExample);
        $this->assertMatchesRegularExpression('/^QUEUE_CONNECTION=redis$/m', $envExample);
        $this->assertMatchesRegularExpression('/^CACHE_STORE=redis$/m', $envExample);
        $this->assertMatchesRegularExpression('/^REDIS_CLIENT=phpredis$/m', $envExample);
        $this->assertMatchesRegularExpression('/^REDIS_HOST=redis$/m', $envExample);
    }

    public function test_redis_cache_store_reads_and_writes_with_ttl(): void
    {
        $store = Cache::store('redis');
        $key = 'pickwise:test:cache:'.bin2hex(random_bytes(8));

        try {
            $this->assertTrue($store->put($key, 'ok', 60));
            $this->assertSame('ok', $store->get($key));
        } finally {
            $store->forget($key);
        }

        $this->assertNull($store->get($key));
    }

    public function test_redis_session_driver_reads_and_writes_sessions(): void
    {
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

            $this->assertSame('pickwise', $reader->get('probe'));
        } finally {
            $writer->getHandler()->destroy($sessionId);
        }
    }

    public function test_redis_queue_connection_pushes_and_pops_jobs(): void
    {
        $queue = Queue::connection('redis');
        $this->assertInstanceOf(RedisQueue::class, $queue);

        $queueName = 'test-p0-s5-'.bin2hex(random_bytes(4));

        try {
            $queue->push('ProbeJob', ['step' => 'P0-S5'], $queueName);
            $job = $queue->pop($queueName);

            $this->assertNotNull($job);
            $this->assertSame('ProbeJob', $job->getName());
            $this->assertSame(['step' => 'P0-S5'], $job->payload()['data']);
            $job->delete();
        } finally {
            $queue->clear($queueName);
        }
    }
}
