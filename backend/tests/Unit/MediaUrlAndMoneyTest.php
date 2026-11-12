<?php

declare(strict_types=1);

use App\Support\MediaUrl;
use App\Support\Money;

test('media url helper resolves public paths and preserves absolute or root-relative urls', function (): void {
    expect(MediaUrl::fromPublicPath(null))->toBeNull()
        ->and(MediaUrl::fromPublicPath(''))->toBeNull()
        ->and(MediaUrl::fromPublicPath('   '))->toBeNull()
        ->and(MediaUrl::fromPublicPath('categories/laptops.svg'))->toBe('/storage/categories/laptops.svg')
        ->and(MediaUrl::fromPublicPath('  /brands/apple.svg  '))->toBe('/brands/apple.svg')
        ->and(MediaUrl::fromPublicPath('https://cdn.example.com/laptop.png'))->toBe('https://cdn.example.com/laptop.png')
        ->and(MediaUrl::fromPublicPath('http://localhost:8080/storage/a.svg'))->toBe('http://localhost:8080/storage/a.svg');
});

test('money helper formats amounts as exact two-decimal strings and normalizes currency', function (): void {
    expect(Money::normalizeAmount(42999))->toBe('42999.00')
        ->and(Money::normalizeAmount('42999'))->toBe('42999.00')
        ->and(Money::normalizeAmount('42999.5'))->toBe('42999.50')
        ->and(Money::normalizeAmount('89999.00'))->toBe('89999.00')
        ->and(Money::normalizeAmount('0'))->toBe('0.00')
        ->and(Money::toArray('89999.00'))->toBe([
            'amount' => '89999.00',
            'currency' => 'INR',
        ])
        ->and(Money::toArray(1499.5, ' inr '))->toBe([
            'amount' => '1499.50',
            'currency' => 'INR',
        ])
        ->and(Money::toArray(100, ''))->toBe([
            'amount' => '100.00',
            'currency' => 'INR',
        ]);
});

test('money helper rejects non-numeric amounts', function (): void {
    expect(static fn (): string => Money::normalizeAmount('not-a-price'))
        ->toThrow(InvalidArgumentException::class);
});

test('money helper compares decimal amounts without floating point drift', function (): void {
    expect(Money::compare('1000.00', '1000'))->toBe(0)
        ->and(Money::compare('9999.99', '10000.00'))->toBe(-1)
        ->and(Money::compare('42999.50', '42999.49'))->toBe(1)
        ->and(Money::compare(0, '0.00'))->toBe(0);
});
