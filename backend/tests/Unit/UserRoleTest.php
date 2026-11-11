<?php

declare(strict_types=1);

use App\Enums\UserRole;

test('user role enum defines expected cases and values', function (): void {
    expect(UserRole::Customer->value)->toBe('customer')
        ->and(UserRole::Admin->value)->toBe('admin')
        ->and(UserRole::values())->toBe(['customer', 'admin'])
        ->and(UserRole::from('customer'))->toBe(UserRole::Customer)
        ->and(UserRole::from('admin'))->toBe(UserRole::Admin)
        ->and(UserRole::tryFrom('moderator'))->toBeNull();
});

test('user role enum exposes labels and role predicates', function (): void {
    expect(UserRole::Customer->label())->toBe('Customer')
        ->and(UserRole::Admin->label())->toBe('Admin')
        ->and(UserRole::Customer->isCustomer())->toBeTrue()
        ->and(UserRole::Customer->isAdmin())->toBeFalse()
        ->and(UserRole::Admin->isAdmin())->toBeTrue()
        ->and(UserRole::Admin->isCustomer())->toBeFalse();
});
