<?php

declare(strict_types=1);

namespace App\Enums;

enum UserRole: string
{
    case Customer = 'customer';
    case Admin = 'admin';

    /**
     * Return all backed string values for validation and schema checks.
     *
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $role): string => $role->value,
            self::cases(),
        );
    }

    public function label(): string
    {
        return match ($this) {
            self::Customer => 'Customer',
            self::Admin => 'Admin',
        };
    }

    public function isAdmin(): bool
    {
        return $this === self::Admin;
    }

    public function isCustomer(): bool
    {
        return $this === self::Customer;
    }
}
