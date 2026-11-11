<?php

declare(strict_types=1);

use App\Http\Resources\ProductSpecResource;
use App\Models\ProductSpec;
use App\Models\SpecDefinition;
use Illuminate\Http\Request;

test('product spec resource throws when specDefinition relation is not loaded', function (): void {
    $spec = new ProductSpec(['value_number' => 16]);

    expect(static fn (): array => (new ProductSpecResource($spec))->toArray(Request::create('/')))
        ->toThrow(LogicException::class, 'specDefinition');
});

test('product spec resource normalizes whole numbers to integers and preserves fractional decimals', function (): void {
    $ramDefinition = new SpecDefinition([
        'key' => 'ram_gb',
        'label' => 'RAM',
        'unit' => 'GB',
        'data_type' => 'number',
        'is_comparable' => true,
        'higher_is_better' => true,
    ]);
    $weightDefinition = new SpecDefinition([
        'key' => 'weight_kg',
        'label' => 'Weight',
        'unit' => 'kg',
        'data_type' => 'number',
        'is_comparable' => true,
        'higher_is_better' => false,
    ]);

    $ramSpec = new ProductSpec(['value_number' => 16.0000]);
    $ramSpec->setRelation('specDefinition', $ramDefinition);

    $weightSpec = new ProductSpec(['value_number' => 1.6200]);
    $weightSpec->setRelation('specDefinition', $weightDefinition);

    $request = Request::create('/');

    expect((new ProductSpecResource($ramSpec))->toArray($request)['value'])->toBe(16)
        ->and((new ProductSpecResource($weightSpec))->toArray($request)['value'])->toBe(1.62);
});
