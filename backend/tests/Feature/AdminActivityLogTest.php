<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Models\AdminActivityLog;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

it('admin_activity_logs schema contains documented columns, indexes, and restrict-on-delete constraint', function (): void {
    expect(Schema::hasTable('admin_activity_logs'))->toBeTrue();

    $columns = Schema::getColumnListing('admin_activity_logs');
    expect($columns)->toContain('id', 'admin_id', 'action', 'subject_type', 'subject_id', 'changes', 'ip_address', 'created_at')
        ->and($columns)->not->toContain('updated_at');

    $admin = User::factory()->admin()->create();
    $product = Product::factory()->create();

    $log = AdminActivityLog::query()->create([
        'admin_id' => $admin->id,
        'action' => 'product.created',
        'subject_type' => $product->getMorphClass(),
        'subject_id' => $product->id,
        'changes' => ['after' => ['name' => $product->name]],
        'ip_address' => '127.0.0.1',
        'created_at' => now(),
    ]);

    expect($log->exists)->toBeTrue()
        ->and($log->admin->id)->toBe($admin->id)
        ->and($log->subject)->toBeInstanceOf(Product::class)
        ->and($log->subject->id)->toBe($product->id)
        ->and($admin->adminActivityLogs)->toHaveCount(1);

    // Deleting an admin who authored activity logs must be restricted at the database layer
    expect(fn () => $admin->delete())->toThrow(QueryException::class);
});

it('enforces append-only immutability at the model level', function (): void {
    $admin = User::factory()->admin()->create();

    $log = AdminActivityLog::query()->create([
        'admin_id' => $admin->id,
        'action' => 'category.created',
        'changes' => ['after' => ['name' => 'Laptops']],
        'ip_address' => '192.168.1.1',
        'created_at' => now(),
    ]);

    expect(fn () => $log->update(['action' => 'category.updated']))
        ->toThrow(BadMethodCallException::class, 'Admin activity logs are append-only and cannot be updated.');

    expect(fn () => $log->delete())
        ->toThrow(BadMethodCallException::class, 'Admin activity logs are append-only and cannot be deleted.');
});

it('records administrative writes and supports request IP resolution', function (): void {
    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create(['name' => 'Smartphones']);

    $mockRequest = Request::create('/admin/categories', 'POST', server: ['REMOTE_ADDR' => '203.0.113.195']);
    $logger = new AuditLogger($mockRequest);

    $log = $logger->record(
        admin: $admin,
        action: 'category.created',
        subject: $category,
        changes: ['after' => ['name' => 'Smartphones']],
    );

    expect($log->admin_id)->toBe($admin->id)
        ->and($log->action)->toBe('category.created')
        ->and($log->subject_type)->toBe($category->getMorphClass())
        ->and($log->subject_id)->toBe($category->id)
        ->and($log->ip_address)->toBe('203.0.113.195')
        ->and($log->changes)->toBe(['after' => ['name' => 'Smartphones']])
        ->and($log->created_at)->not->toBeNull();

    // Explicit IP override should take precedence over request IP
    $logWithExplicitIp = $logger->record(
        admin: $admin,
        action: 'category.archived',
        subject: $category,
        ipAddress: '198.51.100.22',
    );

    expect($logWithExplicitIp->ip_address)->toBe('198.51.100.22');
});

it('rejects non-admin users from authoring activity logs', function (): void {
    $customer = User::factory()->create(['role' => UserRole::Customer]);
    $logger = new AuditLogger;

    expect(fn () => $logger->record($customer, 'product.deleted'))
        ->toThrow(InvalidArgumentException::class, 'Only administrators can author activity logs.');
});

it('provides helper methods for resource create, update, and delete diffs', function (): void {
    $admin = User::factory()->admin()->create();
    $product = Product::factory()->create(['name' => 'Original Name', 'price' => '499.00']);
    $logger = new AuditLogger;

    // 1. Creation helper
    $createLog = $logger->logCreated($admin, $product, ['name' => 'Original Name', 'price' => '499.00'], ipAddress: '10.0.0.1');
    expect($createLog->action)->toBe('product.created')
        ->and($createLog->subject_id)->toBe($product->id)
        ->and($createLog->changes)->toBe(['after' => ['name' => 'Original Name', 'price' => '499.00']]);

    // 2. Update helper (computes before/after diff for only modified fields)
    $before = ['name' => 'Original Name', 'price' => '499.00', 'brand_id' => 1];
    $after = ['name' => 'Updated Name', 'price' => '499.00', 'brand_id' => 2];

    $updateLog = $logger->logUpdated($admin, $product, $before, $after, ipAddress: '10.0.0.1');
    expect($updateLog->action)->toBe('product.updated')
        ->and($updateLog->changes)->toBe([
            'before' => ['name' => 'Original Name', 'brand_id' => 1],
            'after' => ['name' => 'Updated Name', 'brand_id' => 2],
        ]);

    // 3. Deletion helper
    $deleteLog = $logger->logDeleted($admin, $product, ['name' => 'Updated Name', 'price' => '499.00'], ipAddress: '10.0.0.1');
    expect($deleteLog->action)->toBe('product.deleted')
        ->and($deleteLog->changes)->toBe(['before' => ['name' => 'Updated Name', 'price' => '499.00']]);
});

it('sanitizes passwords, tokens, API keys, and prompts while preserving catalog keys', function (): void {
    $admin = User::factory()->admin()->create();
    $logger = new AuditLogger;

    $dirtyPayload = [
        'name' => 'Standard Admin',
        'password' => 'super-secret-password',
        'password_confirmation' => 'super-secret-password',
        'remember_token' => 'random_token_string',
        'share_token' => 'comp_share_token',
        'groq_api_key' => 'gsk_1234567890',
        'prompt' => 'Tell me the best smartphone under $500',
        'nested' => [
            'access_token' => 'bearer-token-123',
            'client_secret' => 'oauth-client-secret',
            'safe_text' => 'This is a description',
        ],
        // Spec definition key like "ram_gb" or "display_type" must NOT be redacted
        'key' => 'ram_gb',
        'price' => '699.99',
    ];

    $log = $logger->record(
        admin: $admin,
        action: 'user.password_updated',
        changes: ['before' => ['password' => 'old-password'], 'after' => $dirtyPayload],
    );

    expect($log->changes)->toBe([
        'before' => [
            'password' => '[REDACTED]',
        ],
        'after' => [
            'name' => 'Standard Admin',
            'password' => '[REDACTED]',
            'password_confirmation' => '[REDACTED]',
            'remember_token' => '[REDACTED]',
            'share_token' => '[REDACTED]',
            'groq_api_key' => '[REDACTED]',
            'prompt' => '[REDACTED]',
            'nested' => [
                'access_token' => '[REDACTED]',
                'client_secret' => '[REDACTED]',
                'safe_text' => 'This is a description',
            ],
            'key' => 'ram_gb',
            'price' => '699.99',
        ],
    ]);
});

it('supports factory creation for testing admin activity log records', function (): void {
    $log = AdminActivityLog::factory()->create();

    expect($log->exists)->toBeTrue()
        ->and($log->admin)->toBeInstanceOf(User::class)
        ->and($log->admin->isAdmin())->toBeTrue()
        ->and($log->action)->toBe('product.updated')
        ->and($log->changes)->toHaveKeys(['before', 'after']);
});
