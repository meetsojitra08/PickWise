<?php

declare(strict_types=1);

namespace App\Enums;

enum ProductAvailability: string
{
    case InStock = 'in_stock';
    case LowStock = 'low_stock';
    case OutOfStock = 'out_of_stock';

    /**
     * Return all backed string values for validation and schema checks.
     *
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $availability): string => $availability->value,
            self::cases(),
        );
    }

    public function label(): string
    {
        return match ($this) {
            self::InStock => 'In Stock',
            self::LowStock => 'Low Stock',
            self::OutOfStock => 'Out of Stock',
        };
    }
}
