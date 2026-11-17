<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Api\V1\Admin\AdminUserController;
use App\Http\Requests\Admin\UpdateAdminUserRequest;
use App\Models\AdminActivityLog;
use App\Models\Category;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->admin = User::factory()->admin()->create([
        'name' => 'Root Administrator',
        'email' => 'admin@pickwise.test',
        'is_active' => true,
    ]);
});

it('rejects unauthenticated requests to user management', function (): void {
    $this->getJson('/api/v1/admin/users')
        ->assertUnauthorized()
        ->assertJsonPath('error.code', 'unauthenticated');

    $target = User::factory()->create();

    $this->patchJson("/api/v1/admin/users/{$target->id}", ['is_active' => false])
        ->assertUnauthorized()
        ->assertJsonPath('error.code', 'unauthenticated');
});

it('rejects non-admin customers from managing users', function (): void {
    $customer = User::factory()->create([
        'role' => UserRole::Customer,
        'is_active' => true,
    ]);

    $this->actingAs($customer)
        ->getJson('/api/v1/admin/users')
        ->assertForbidden()
        ->assertJsonPath('error.code', 'forbidden');

    $this->actingAs($customer)
        ->patchJson("/api/v1/admin/users/{$customer->id}", ['role' => UserRole::Admin->value])
        ->assertForbidden()
        ->assertJsonPath('error.code', 'forbidden');
});

it('rejects deactivated admins from managing users', function (): void {
    $deactivatedAdmin = User::factory()->admin()->inactive()->create();

    $this->actingAs($deactivatedAdmin)
        ->getJson('/api/v1/admin/users')
        ->assertForbidden()
        ->assertJsonPath('error.code', 'forbidden');
});

it('lists users with search, role filter, active filter, and review count', function (): void {
    $category = Category::factory()->create(['is_active' => true]);
    $product = Product::factory()->create(['category_id' => $category->id, 'is_published' => true]);

    $userA = User::factory()->create([
        'name' => 'Alice Green',
        'email' => 'alice@example.com',
        'role' => UserRole::Customer,
        'is_active' => true,
        'created_at' => now()->subDays(5),
    ]);

    $userB = User::factory()->create([
        'name' => 'Bob White',
        'email' => 'bob@example.com',
        'role' => UserRole::Customer,
        'is_active' => false,
        'created_at' => now()->subDays(2),
    ]);

    // Create review for userA
    Review::query()->create([
        'product_id' => $product->id,
        'user_id' => $userA->id,
        'author_name' => $userA->name,
        'rating' => 5,
        'title' => 'Great product',
        'body' => 'Really loved this product!',
    ]);

    // Test list all users
    $response = $this->actingAs($this->admin)->getJson('/api/v1/admin/users');
    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'name',
                    'email',
                    'role',
                    'is_active',
                    'reviews_count',
                    'created_at',
                ],
            ],
            'meta' => [
                'current_page',
                'per_page',
                'total',
            ],
        ]);

    // Test search by name
    $searchRes = $this->actingAs($this->admin)->getJson('/api/v1/admin/users?search=alice');
    $searchRes->assertOk();
    $data = $searchRes->json('data');
    expect($data)->toHaveCount(1)
        ->and($data[0]['email'])->toBe('alice@example.com')
        ->and($data[0]['reviews_count'])->toBe(1);

    // Test search by email
    $searchEmailRes = $this->actingAs($this->admin)->getJson('/api/v1/admin/users?search=bob@example.com');
    $searchEmailRes->assertOk();
    expect($searchEmailRes->json('data'))->toHaveCount(1)
        ->and($searchEmailRes->json('data.0.name'))->toBe('Bob White');

    // Test filter by role
    $adminRoleRes = $this->actingAs($this->admin)->getJson('/api/v1/admin/users?role=admin');
    $adminRoleRes->assertOk();
    $adminItems = $adminRoleRes->json('data');
    foreach ($adminItems as $item) {
        expect($item['role'])->toBe('admin');
    }

    // Test filter by active status
    $inactiveRes = $this->actingAs($this->admin)->getJson('/api/v1/admin/users?is_active=0');
    $inactiveRes->assertOk();
    $inactiveItems = $inactiveRes->json('data');
    expect(collect($inactiveItems)->pluck('email'))->toContain('bob@example.com')
        ->and(collect($inactiveItems)->pluck('email'))->not->toContain('alice@example.com');

    // Test sort by reviews_count descending
    $sortRes = $this->actingAs($this->admin)->getJson('/api/v1/admin/users?sort=-reviews_count');
    $sortRes->assertOk();
    expect($sortRes->json('data.0.id'))->toBe($userA->id);
});

it('activates and deactivates a user and records an audit log', function (): void {
    $target = User::factory()->create([
        'name' => 'Priya Patel',
        'is_active' => true,
    ]);

    // Deactivate user
    $deactivateRes = $this->actingAs($this->admin)->patchJson("/api/v1/admin/users/{$target->id}", [
        'is_active' => false,
    ]);

    $deactivateRes->assertOk()
        ->assertJsonPath('data.id', $target->id)
        ->assertJsonPath('data.is_active', false);

    expect($target->fresh()->isActive())->toBeFalse();

    // Check audit log
    $log = AdminActivityLog::query()
        ->where('admin_id', $this->admin->id)
        ->where('subject_type', $target->getMorphClass())
        ->where('subject_id', $target->id)
        ->latest('id')
        ->first();

    expect($log)->not->toBeNull()
        ->and($log->action)->toBe('user.updated')
        ->and($log->changes['after']['is_active'])->toBeFalse();

    // Reactivate user
    $activateRes = $this->actingAs($this->admin)->patchJson("/api/v1/admin/users/{$target->id}", [
        'is_active' => true,
    ]);

    $activateRes->assertOk()
        ->assertJsonPath('data.is_active', true);

    expect($target->fresh()->isActive())->toBeTrue();
});

it('changes a user role between customer and admin and records an audit log', function (): void {
    $customer = User::factory()->create([
        'role' => UserRole::Customer,
        'is_active' => true,
    ]);

    // Promote to admin
    $promoteRes = $this->actingAs($this->admin)->patchJson("/api/v1/admin/users/{$customer->id}", [
        'role' => UserRole::Admin->value,
    ]);

    $promoteRes->assertOk()
        ->assertJsonPath('data.role', UserRole::Admin->value);

    expect($customer->fresh()->isAdmin())->toBeTrue();

    // Demote back to customer
    $demoteRes = $this->actingAs($this->admin)->patchJson("/api/v1/admin/users/{$customer->id}", [
        'role' => UserRole::Customer->value,
    ]);

    $demoteRes->assertOk()
        ->assertJsonPath('data.role', UserRole::Customer->value);

    expect($customer->fresh()->isCustomer())->toBeTrue();
});

it('prevents an admin from deactivating or demoting themselves', function (): void {
    // Attempt self-deactivation
    $selfDeactivateRes = $this->actingAs($this->admin)->patchJson("/api/v1/admin/users/{$this->admin->id}", [
        'is_active' => false,
    ]);

    $selfDeactivateRes->assertForbidden()
        ->assertJsonPath('error.message', 'You cannot modify your own active status or role.');

    // Attempt self-demotion
    $selfDemoteRes = $this->actingAs($this->admin)->patchJson("/api/v1/admin/users/{$this->admin->id}", [
        'role' => UserRole::Customer->value,
    ]);

    $selfDemoteRes->assertForbidden()
        ->assertJsonPath('error.message', 'You cannot modify your own active status or role.');
});

it('prevents removing or deactivating the last active administrator', function (): void {
    $secondAdmin = User::factory()->admin()->create(['is_active' => true]);

    // $this->admin deactivates $secondAdmin, leaving $this->admin as the only active admin
    $this->actingAs($this->admin)->patchJson("/api/v1/admin/users/{$secondAdmin->id}", [
        'is_active' => false,
    ])->assertOk();

    expect(User::query()->where('role', UserRole::Admin)->where('is_active', true)->count())->toBe(1);

    // Make $secondAdmin the only active admin by deactivating $this->admin
    $this->admin->is_active = false;
    $this->admin->save();

    $secondAdmin->refresh();
    $secondAdmin->is_active = true;
    $secondAdmin->save();

    expect(User::query()->where('role', UserRole::Admin)->where('is_active', true)->count())->toBe(1);
    expect(User::query()->where('role', UserRole::Admin)->where('is_active', true)->first()->id)->toBe($secondAdmin->id);

    // Invoke update via controller when no other active admin exists
    $controller = app(AdminUserController::class);
    $request = UpdateAdminUserRequest::create(
        "/api/v1/admin/users/{$secondAdmin->id}",
        'PATCH',
        ['is_active' => false]
    );

    $actingAdmin = User::factory()->admin()->make(['id' => 9999, 'is_active' => true]);
    $request->setUserResolver(fn () => $actingAdmin);

    expect(fn () => $controller->update($request, $secondAdmin))
        ->toThrow(ValidationException::class);
});

it('logs out a deactivated user on their next request and prevents them from logging in', function (): void {
    $password = 'Secret1234!';
    $customer = User::factory()->create([
        'email' => 'victim@example.com',
        'password' => Hash::make($password),
        'is_active' => true,
    ]);

    // Step 1: Customer logs in and obtains session
    $loginRes = $this->postJson('/api/v1/auth/login', [
        'email' => 'victim@example.com',
        'password' => $password,
    ]);
    $loginRes->assertOk();

    // Verify /api/v1/auth/me works while active
    $meRes = $this->getJson('/api/v1/auth/me');
    $meRes->assertOk()->assertJsonPath('data.email', 'victim@example.com');

    // Step 2: Admin deactivates customer account
    $this->actingAs($this->admin)->patchJson("/api/v1/admin/users/{$customer->id}", [
        'is_active' => false,
    ])->assertOk();

    expect($customer->fresh()->isActive())->toBeFalse();

    // Step 3: Deactivated customer makes their next request
    $this->actingAs($customer->fresh());

    $nextReq = $this->getJson('/api/v1/auth/me');
    $nextReq->assertForbidden()
        ->assertJsonPath('error.message', 'Your account has been deactivated.');

    // Step 4: Verify customer cannot log in anymore
    $secondLogin = $this->postJson('/api/v1/auth/login', [
        'email' => 'victim@example.com',
        'password' => $password,
    ]);
    $secondLogin->assertStatus(422)
        ->assertJsonPath('error.message', 'Your account has been deactivated.')
        ->assertJsonPath('error.details.email.0', 'Your account has been deactivated.');
});
