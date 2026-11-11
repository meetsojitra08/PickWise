<?php

declare(strict_types=1);

use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Policies\BasePolicy;
use App\Policies\UserPolicy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;

uses(RefreshDatabase::class);

test('role middleware restricts admin routes to active admins', function (): void {
    Route::middleware(['api', 'auth:sanctum', 'role:admin'])
        ->get('/api/v1/_test/admin/dashboard', static fn (): JsonResponse => ApiResponse::success(['area' => 'admin']));

    $this->withHeader('X-Request-Id', 'req-admin-guest')
        ->getJson('/api/v1/_test/admin/dashboard')
        ->assertUnauthorized()
        ->assertExactJson([
            'error' => [
                'code' => 'unauthenticated',
                'message' => 'Unauthenticated.',
                'request_id' => 'req-admin-guest',
            ],
        ]);

    $customer = User::factory()->create();

    $this->actingAs($customer)
        ->withHeader('X-Request-Id', 'req-admin-customer')
        ->getJson('/api/v1/_test/admin/dashboard')
        ->assertForbidden()
        ->assertExactJson([
            'error' => [
                'code' => 'forbidden',
                'message' => 'You do not have permission to access this resource.',
                'request_id' => 'req-admin-customer',
            ],
        ]);

    $inactiveAdmin = User::factory()->admin()->inactive()->create();

    $this->actingAs($inactiveAdmin)
        ->withHeader('X-Request-Id', 'req-admin-inactive')
        ->getJson('/api/v1/_test/admin/dashboard')
        ->assertForbidden()
        ->assertExactJson([
            'error' => [
                'code' => 'forbidden',
                'message' => 'Your account has been deactivated.',
                'request_id' => 'req-admin-inactive',
            ],
        ]);

    $activeAdmin = User::factory()->admin()->create();

    $this->actingAs($activeAdmin)
        ->getJson('/api/v1/_test/admin/dashboard')
        ->assertOk()
        ->assertExactJson([
            'data' => [
                'area' => 'admin',
            ],
        ]);
});

test('role middleware supports multiple roles and rejects misconfigured role definitions', function (): void {
    Route::middleware(['api', 'auth:sanctum', 'role:admin,customer'])
        ->get('/api/v1/_test/shared', static fn (): JsonResponse => ApiResponse::success(['allowed' => true]));

    Route::middleware(['api', 'auth:sanctum', 'role:superadmin'])
        ->get('/api/v1/_test/bad-role', static fn (): JsonResponse => ApiResponse::success(['allowed' => true]));

    Route::middleware(['api', 'auth:sanctum', EnsureUserHasRole::class])
        ->get('/api/v1/_test/missing-role', static fn (): JsonResponse => ApiResponse::success(['allowed' => true]));

    $customer = User::factory()->create();
    $admin = User::factory()->admin()->create();

    $this->actingAs($customer)->getJson('/api/v1/_test/shared')->assertOk();
    $this->actingAs($admin)->getJson('/api/v1/_test/shared')->assertOk();

    expect(fn () => $this->withoutExceptionHandling()->actingAs($admin)->getJson('/api/v1/_test/bad-role'))
        ->toThrow(InvalidArgumentException::class, 'Invalid role "superadmin" passed to role middleware.');

    expect(fn () => $this->withoutExceptionHandling()->actingAs($admin)->getJson('/api/v1/_test/missing-role'))
        ->toThrow(InvalidArgumentException::class, 'At least one role must be provided to the role middleware.');
});

test('access-admin gate allows active admins and rejects customers or deactivated admins', function (): void {
    $customer = User::factory()->create();
    $inactiveAdmin = User::factory()->admin()->inactive()->create();
    $activeAdmin = User::factory()->admin()->create();

    expect(Gate::forUser($customer)->allows('access-admin'))->toBeFalse()
        ->and(Gate::forUser($inactiveAdmin)->allows('access-admin'))->toBeFalse()
        ->and(Gate::forUser($activeAdmin)->allows('access-admin'))->toBeTrue();
});

test('user policy resolves via gate and enforces self and admin boundaries', function (): void {
    expect(Gate::getPolicyFor(User::class))->toBeInstanceOf(UserPolicy::class);

    $customer = User::factory()->create();
    $otherCustomer = User::factory()->create();
    $inactiveCustomer = User::factory()->inactive()->create();
    $admin = User::factory()->admin()->create();
    $inactiveAdmin = User::factory()->admin()->inactive()->create();

    expect(Gate::forUser($admin)->allows('viewAny', User::class))->toBeTrue()
        ->and(Gate::forUser($customer)->allows('viewAny', User::class))->toBeFalse()
        ->and(Gate::forUser($inactiveAdmin)->allows('viewAny', User::class))->toBeFalse();

    expect(Gate::forUser($customer)->allows('view', $customer))->toBeTrue()
        ->and(Gate::forUser($customer)->allows('view', $otherCustomer))->toBeFalse()
        ->and(Gate::forUser($admin)->allows('view', $otherCustomer))->toBeTrue()
        ->and(Gate::forUser($inactiveCustomer)->allows('view', $inactiveCustomer))->toBeFalse();

    expect(Gate::forUser($customer)->allows('update', $customer))->toBeTrue()
        ->and(Gate::forUser($customer)->allows('update', $otherCustomer))->toBeFalse()
        ->and(Gate::forUser($admin)->allows('update', $otherCustomer))->toBeFalse()
        ->and(Gate::forUser($inactiveCustomer)->allows('update', $inactiveCustomer))->toBeFalse();

    $selfManage = Gate::forUser($admin)->inspect('manage', $admin);

    expect(Gate::forUser($admin)->allows('manage', $otherCustomer))->toBeTrue()
        ->and($selfManage->denied())->toBeTrue()
        ->and($selfManage->message())->toBe('You cannot modify your own active status or role.')
        ->and(Gate::forUser($customer)->allows('manage', $otherCustomer))->toBeFalse()
        ->and(Gate::forUser($inactiveAdmin)->allows('manage', $otherCustomer))->toBeFalse();

    expect(Gate::forUser($admin)->allows('delete', $otherCustomer))->toBeFalse();
});

test('base policy ownership helper handles active owners, nullable keys, and inactive accounts', function (): void {
    $policy = new class extends BasePolicy
    {
        public function canAdmin(User $user): bool
        {
            return $this->isActiveAdmin($user);
        }

        public function canOwn(User $user, Model $model): bool
        {
            return $this->owns($user, $model);
        }
    };

    $owner = User::factory()->create();
    $other = User::factory()->create();
    $inactiveOwner = User::factory()->inactive()->create();
    $admin = User::factory()->admin()->create();
    $inactiveAdmin = User::factory()->admin()->inactive()->create();

    $ownedByInt = new class extends Model {};
    $ownedByInt->setAttribute('user_id', $owner->id);

    $ownedByString = new class extends Model {};
    $ownedByString->setAttribute('user_id', (string) $owner->id);

    $unowned = new class extends Model {};
    $unowned->setAttribute('user_id', null);

    $ownedByInactive = new class extends Model {};
    $ownedByInactive->setAttribute('user_id', $inactiveOwner->id);

    expect($policy->canAdmin($admin))->toBeTrue()
        ->and($policy->canAdmin($inactiveAdmin))->toBeFalse()
        ->and($policy->canAdmin($owner))->toBeFalse()
        ->and($policy->canOwn($owner, $ownedByInt))->toBeTrue()
        ->and($policy->canOwn($owner, $ownedByString))->toBeTrue()
        ->and($policy->canOwn($other, $ownedByInt))->toBeFalse()
        ->and($policy->canOwn($owner, $unowned))->toBeFalse()
        ->and($policy->canOwn($inactiveOwner, $ownedByInactive))->toBeFalse();
});
