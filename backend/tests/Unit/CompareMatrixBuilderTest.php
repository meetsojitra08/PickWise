<?php

declare(strict_types=1);

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductSpec;
use App\Models\SpecDefinition;
use App\Services\CompareMatrixBuilder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('builds comparable rows in definition order and highlights the best value', function (): void {
    $category = Category::factory()->create(['name' => 'Laptops', 'slug' => 'laptops']);
    $alpha = Product::factory()->for($category)->create(['name' => 'Alpha']);
    $beta = Product::factory()->for($category)->create(['name' => 'Beta']);
    $gamma = Product::factory()->for($category)->create(['name' => 'Gamma']);

    $ram = SpecDefinition::factory()->for($category)->numeric('GB', true)->comparable()->create([
        'key' => 'ram_gb',
        'label' => 'RAM',
        'sort_order' => 1,
    ]);
    $weight = SpecDefinition::factory()->for($category)->numeric('kg', false)->comparable()->create([
        'key' => 'weight_kg',
        'label' => 'Weight',
        'sort_order' => 2,
    ]);
    $gpu = SpecDefinition::factory()->for($category)->boolean()->comparable()->create([
        'key' => 'dedicated_gpu',
        'label' => 'Dedicated GPU',
        'sort_order' => 3,
    ]);
    $panel = SpecDefinition::factory()->for($category)->text()->comparable()->create([
        'key' => 'panel',
        'label' => 'Panel',
        'sort_order' => 4,
    ]);
    $refresh = SpecDefinition::factory()->for($category)->numeric('Hz', null)->comparable()->create([
        'key' => 'refresh_hz',
        'label' => 'Refresh rate',
        'sort_order' => 5,
    ]);
    $touch = SpecDefinition::factory()->for($category)->boolean()->comparable()->create([
        'key' => 'touchscreen',
        'label' => 'Touchscreen',
        'sort_order' => 6,
    ]);
    $notComparable = SpecDefinition::factory()->for($category)->numeric('mm', true)->create([
        'key' => 'thickness_mm',
        'label' => 'Thickness',
        'sort_order' => 7,
    ]);
    SpecDefinition::factory()->for($category)->numeric('GB', true)->comparable()->create([
        'key' => 'empty_spec',
        'label' => 'Empty spec',
        'sort_order' => 8,
    ]);

    foreach ([
        [$alpha, $ram, 16.0],
        [$beta, $ram, 32.0],
        [$gamma, $ram, 24.0],
        [$alpha, $weight, 1.4],
        [$beta, $weight, 1.4],
        [$gamma, $weight, 1.8],
        [$alpha, $refresh, 60.0],
        [$beta, $refresh, 120.0],
        [$gamma, $refresh, 144.0],
        [$alpha, $notComparable, 18.0],
    ] as [$product, $definition, $number]) {
        ProductSpec::factory()
            ->for($product)
            ->for($definition, 'specDefinition')
            ->numericValue($number)
            ->create();
    }

    foreach ([
        [$alpha, $gpu, false],
        [$beta, $gpu, true],
        [$gamma, $gpu, false],
        [$beta, $touch, true],
    ] as [$product, $definition, $bool]) {
        ProductSpec::factory()
            ->for($product)
            ->for($definition, 'specDefinition')
            ->booleanValue($bool)
            ->create();
    }

    foreach ([
        [$alpha, $panel, 'OLED'],
        [$beta, $panel, 'IPS'],
        [$gamma, $panel, 'OLED'],
    ] as [$product, $definition, $text]) {
        ProductSpec::factory()
            ->for($product)
            ->for($definition, 'specDefinition')
            ->textValue($text)
            ->create();
    }

    $matrix = app(CompareMatrixBuilder::class)->build([$gamma->id, $alpha->id, $beta->id]);

    expect($matrix->category->is($category))->toBeTrue()
        ->and($matrix->products->pluck('id')->all())->toBe([$gamma->id, $alpha->id, $beta->id])
        ->and(array_column($matrix->rows, 'key'))->toBe([
            'ram_gb',
            'weight_kg',
            'dedicated_gpu',
            'panel',
            'refresh_hz',
            'touchscreen',
        ]);

    $rows = collect($matrix->rows)->keyBy('key');

    expect($rows['ram_gb']['values'])->toBe([
        ['product_id' => $gamma->id, 'value' => 24],
        ['product_id' => $alpha->id, 'value' => 16],
        ['product_id' => $beta->id, 'value' => 32],
    ])
        ->and($rows['ram_gb']['winner_product_id'])->toBe($beta->id)
        ->and($rows['weight_kg']['winner_product_id'])->toBeNull()
        ->and($rows['dedicated_gpu']['winner_product_id'])->toBe($beta->id)
        ->and($rows['panel']['winner_product_id'])->toBeNull()
        ->and($rows['refresh_hz']['winner_product_id'])->toBeNull()
        ->and($rows['touchscreen']['values'])->toBe([
            ['product_id' => $gamma->id, 'value' => null],
            ['product_id' => $alpha->id, 'value' => null],
            ['product_id' => $beta->id, 'value' => true],
        ])
        ->and($rows['touchscreen']['winner_product_id'])->toBe($beta->id);
});

test('throws when a requested product cannot be found', function (): void {
    $category = Category::factory()->create();
    $product = Product::factory()->for($category)->create();

    expect(static fn (): mixed => app(CompareMatrixBuilder::class)->build([$product->id, 999999]))
        ->toThrow(ModelNotFoundException::class);
});
