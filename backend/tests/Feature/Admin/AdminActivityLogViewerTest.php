<?php

declare(strict_types=1);

use App\Models\AdminActivityLog;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Carbon::setTestNow('2026-11-17 10:00:00');
});

afterEach(function (): void {
    Carbon::setTestNow();
});

test('it rejects unauthenticated requests to activity logs', function (): void {
    $response = $this->getJson('/api/v1/admin/activity-logs');

    $response->assertStatus(401)
        ->assertJsonPath('error.code', 'unauthenticated');
});

test('it rejects non-admin customers from viewing activity logs', function (): void {
    $customer = User::factory()->create();

    $response = $this->actingAs($customer)->getJson('/api/v1/admin/activity-logs');

    $response->assertStatus(403)
        ->assertJsonPath('error.code', 'forbidden');
});

test('it rejects deactivated admins from viewing activity logs', function (): void {
    $admin = User::factory()->admin()->inactive()->create();

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/activity-logs');

    $response->assertStatus(403)
        ->assertJsonPath('error.code', 'forbidden');
});

test('it lists activity logs with pagination and default date window', function (): void {
    $admin = User::factory()->admin()->create();

    AdminActivityLog::factory()->count(12)->create([
        'admin_id' => $admin->id,
        'action' => 'product.updated',
        'created_at' => Carbon::now('UTC')->subDays(2),
    ]);

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/activity-logs?per_page=5&page=1');

    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'admin' => ['id', 'name', 'email'],
                    'action',
                    'subject_type',
                    'subject_id',
                    'changes',
                    'ip_address',
                    'created_at',
                ],
            ],
            'links' => ['first', 'last', 'prev', 'next'],
            'meta' => ['current_page', 'from', 'last_page', 'per_page', 'to', 'total'],
        ])
        ->assertJsonPath('meta.current_page', 1)
        ->assertJsonPath('meta.per_page', 5)
        ->assertJsonPath('meta.total', 12)
        ->assertJsonPath('meta.last_page', 3)
        ->assertJsonCount(5, 'data');
});

test('it filters activity logs by admin id', function (): void {
    $adminA = User::factory()->admin()->create(['name' => 'Admin Alpha']);
    $adminB = User::factory()->admin()->create(['name' => 'Admin Beta']);

    AdminActivityLog::factory()->create([
        'admin_id' => $adminA->id,
        'action' => 'category.created',
        'created_at' => Carbon::now('UTC')->subDays(1),
    ]);

    AdminActivityLog::factory()->create([
        'admin_id' => $adminB->id,
        'action' => 'brand.created',
        'created_at' => Carbon::now('UTC')->subDays(1),
    ]);

    $response = $this->actingAs($adminA)->getJson('/api/v1/admin/activity-logs?admin_id='.$adminA->id);

    $response->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.admin.id', $adminA->id)
        ->assertJsonPath('data.0.action', 'category.created');
});

test('it filters activity logs by action', function (): void {
    $admin = User::factory()->admin()->create();

    AdminActivityLog::factory()->create([
        'admin_id' => $admin->id,
        'action' => 'product.created',
        'created_at' => Carbon::now('UTC')->subDays(1),
    ]);

    AdminActivityLog::factory()->create([
        'admin_id' => $admin->id,
        'action' => 'product.updated',
        'created_at' => Carbon::now('UTC')->subDays(1),
    ]);

    AdminActivityLog::factory()->create([
        'admin_id' => $admin->id,
        'action' => 'review.moderated',
        'created_at' => Carbon::now('UTC')->subDays(1),
    ]);

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/activity-logs?action=product.created');

    $response->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.action', 'product.created');
});

test('it filters activity logs by subject type', function (): void {
    $admin = User::factory()->admin()->create();
    $product = Product::factory()->create();

    AdminActivityLog::factory()->create([
        'admin_id' => $admin->id,
        'action' => 'product.created',
        'subject_type' => Product::class,
        'subject_id' => $product->id,
        'created_at' => Carbon::now('UTC')->subDays(1),
    ]);

    AdminActivityLog::factory()->create([
        'admin_id' => $admin->id,
        'action' => 'user.updated',
        'subject_type' => User::class,
        'subject_id' => $admin->id,
        'created_at' => Carbon::now('UTC')->subDays(1),
    ]);

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/activity-logs?subject_type=Product');

    $response->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.action', 'product.created')
        ->assertJsonPath('data.0.subject_id', $product->id);
});

test('it filters activity logs by keyword search', function (): void {
    $adminA = User::factory()->admin()->create(['name' => 'John Constantine', 'email' => 'john@hellblazer.com']);
    $adminB = User::factory()->admin()->create(['name' => 'Bruce Wayne', 'email' => 'bruce@wayne.com']);

    AdminActivityLog::factory()->create([
        'admin_id' => $adminA->id,
        'action' => 'product.price_updated',
        'ip_address' => '198.51.100.42',
        'created_at' => Carbon::now('UTC')->subDays(1),
    ]);

    AdminActivityLog::factory()->create([
        'admin_id' => $adminB->id,
        'action' => 'brand.created',
        'ip_address' => '203.0.113.88',
        'created_at' => Carbon::now('UTC')->subDays(1),
    ]);

    // Search by IP address
    $ipSearch = $this->actingAs($adminA)->getJson('/api/v1/admin/activity-logs?search=198.51.100.42');
    $ipSearch->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.ip_address', '198.51.100.42');

    // Search by admin name
    $nameSearch = $this->actingAs($adminA)->getJson('/api/v1/admin/activity-logs?search=Constantine');
    $nameSearch->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.admin.name', 'John Constantine');

    // Search by action substring
    $actionSearch = $this->actingAs($adminA)->getJson('/api/v1/admin/activity-logs?search=price_updated');
    $actionSearch->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.action', 'product.price_updated');
});

test('it validates date range limit of 90 days and chronological order', function (): void {
    $admin = User::factory()->admin()->create();

    // End date before start date
    $responseInvalidOrder = $this->actingAs($admin)->getJson('/api/v1/admin/activity-logs?'.http_build_query([
        'start_date' => '2026-11-10',
        'end_date' => '2026-11-05',
    ]));

    $responseInvalidOrder->assertStatus(422)
        ->assertJsonValidationErrors(['end_date'], 'error.details');

    // Range exceeding 90 days
    $responseExceeding = $this->actingAs($admin)->getJson('/api/v1/admin/activity-logs?'.http_build_query([
        'start_date' => '2026-05-01',
        'end_date' => '2026-11-01',
    ]));

    $responseExceeding->assertStatus(422)
        ->assertJsonValidationErrors(['start_date'], 'error.details');
});

test('it verifies activity logs are append-only with no mutate endpoints', function (): void {
    $admin = User::factory()->admin()->create();
    $log = AdminActivityLog::factory()->create(['admin_id' => $admin->id]);

    $postResponse = $this->actingAs($admin)->postJson('/api/v1/admin/activity-logs', ['action' => 'illegal']);
    expect($postResponse->status())->toBeIn([404, 405]);

    $putResponse = $this->actingAs($admin)->putJson("/api/v1/admin/activity-logs/{$log->id}", ['action' => 'illegal']);
    expect($putResponse->status())->toBeIn([404, 405]);

    $patchResponse = $this->actingAs($admin)->patchJson("/api/v1/admin/activity-logs/{$log->id}", ['action' => 'illegal']);
    expect($patchResponse->status())->toBeIn([404, 405]);

    $deleteResponse = $this->actingAs($admin)->deleteJson("/api/v1/admin/activity-logs/{$log->id}");
    expect($deleteResponse->status())->toBeIn([404, 405]);
});
