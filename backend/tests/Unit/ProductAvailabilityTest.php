<?php

declare(strict_types=1);

use App\Enums\ProductAvailability;

test('product availability enum defines expected cases and values', function (): void {
    expect(ProductAvailability::InStock->value)->toBe('in_stock')
        ->and(ProductAvailability::LowStock->value)->toBe('low_stock')
        ->and(ProductAvailability::OutOfStock->value)->toBe('out_of_stock')
        ->and(ProductAvailability::values())->toBe(['in_stock', 'low_stock', 'out_of_stock'])
        ->and(ProductAvailability::from('in_stock'))->toBe(ProductAvailability::InStock)
        ->and(ProductAvailability::from('low_stock'))->toBe(ProductAvailability::LowStock)
        ->and(ProductAvailability::from('out_of_stock'))->toBe(ProductAvailability::OutOfStock)
        ->and(ProductAvailability::tryFrom('discontinued'))->toBeNull();
});

test('product availability enum exposes human labels', function (): void {
    expect(ProductAvailability::InStock->label())->toBe('In Stock')
        ->and(ProductAvailability::LowStock->label())->toBe('Low Stock')
        ->and(ProductAvailability::OutOfStock->label())->toBe('Out of Stock');
});
