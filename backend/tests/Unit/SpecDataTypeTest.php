<?php

declare(strict_types=1);

use App\Enums\SpecDataType;

test('spec data type enum defines expected cases and values', function (): void {
    expect(SpecDataType::Number->value)->toBe('number')
        ->and(SpecDataType::Text->value)->toBe('text')
        ->and(SpecDataType::Boolean->value)->toBe('boolean')
        ->and(SpecDataType::values())->toBe(['number', 'text', 'boolean'])
        ->and(SpecDataType::from('number'))->toBe(SpecDataType::Number)
        ->and(SpecDataType::from('text'))->toBe(SpecDataType::Text)
        ->and(SpecDataType::from('boolean'))->toBe(SpecDataType::Boolean)
        ->and(SpecDataType::tryFrom('json'))->toBeNull();
});

test('spec data type enum exposes human labels', function (): void {
    expect(SpecDataType::Number->label())->toBe('Number')
        ->and(SpecDataType::Text->label())->toBe('Text')
        ->and(SpecDataType::Boolean->label())->toBe('Boolean');
});
