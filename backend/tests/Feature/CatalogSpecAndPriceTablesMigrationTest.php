<?php

declare(strict_types=1);

use App\Enums\SpecDataType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('spec_definitions, product_specs, and price_history tables have expected columns and indexes', function (): void {
    expect(Schema::hasColumns('spec_definitions', [
        'id',
        'category_id',
        'key',
        'label',
        'unit',
        'data_type',
        'is_filterable',
        'is_comparable',
        'higher_is_better',
        'sort_order',
        'created_at',
        'updated_at',
    ]))->toBeTrue()
        ->and(Schema::hasIndex('spec_definitions', ['category_id', 'key'], 'unique'))->toBeTrue()
        ->and(Schema::hasIndex('spec_definitions', ['category_id', 'sort_order']))->toBeTrue()
        ->and(Schema::hasIndex('spec_definitions', ['category_id', 'is_filterable', 'sort_order']))->toBeTrue()
        ->and(Schema::hasIndex('spec_definitions', ['category_id', 'is_comparable', 'sort_order']))->toBeTrue();

    expect(Schema::hasColumns('product_specs', [
        'id',
        'product_id',
        'spec_definition_id',
        'value_text',
        'value_number',
        'value_bool',
        'created_at',
        'updated_at',
    ]))->toBeTrue()
        ->and(Schema::hasIndex('product_specs', ['product_id', 'spec_definition_id'], 'unique'))->toBeTrue()
        ->and(Schema::hasIndex('product_specs', ['spec_definition_id', 'value_number']))->toBeTrue()
        ->and(Schema::hasIndex('product_specs', ['spec_definition_id', 'value_bool']))->toBeTrue()
        ->and(Schema::hasIndex('product_specs', ['spec_definition_id', 'value_text']))->toBeTrue();

    expect(Schema::hasColumns('price_history', [
        'id',
        'product_id',
        'price',
        'recorded_at',
        'created_at',
        'updated_at',
    ]))->toBeTrue()
        ->and(Schema::hasIndex('price_history', ['product_id', 'recorded_at']))->toBeTrue();

    if (DB::getDriverName() === 'pgsql') {
        $specDefinitionColumns = collect(DB::select(
            "SELECT column_name, data_type, character_maximum_length, is_nullable
             FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'spec_definitions'"
        ))->keyBy('column_name');

        expect($specDefinitionColumns->get('unit')?->is_nullable)->toBe('YES')
            ->and($specDefinitionColumns->get('data_type')?->character_maximum_length)->toBe(20)
            ->and($specDefinitionColumns->get('is_filterable')?->data_type)->toBe('boolean')
            ->and($specDefinitionColumns->get('is_comparable')?->data_type)->toBe('boolean')
            ->and($specDefinitionColumns->get('higher_is_better')?->data_type)->toBe('boolean')
            ->and($specDefinitionColumns->get('higher_is_better')?->is_nullable)->toBe('YES')
            ->and($specDefinitionColumns->get('sort_order')?->data_type)->toBe('integer');

        $productSpecColumns = collect(DB::select(
            "SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale, is_nullable
             FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'product_specs'"
        ))->keyBy('column_name');

        expect($productSpecColumns->get('value_text')?->character_maximum_length)->toBe(500)
            ->and($productSpecColumns->get('value_text')?->is_nullable)->toBe('YES')
            ->and($productSpecColumns->get('value_number')?->data_type)->toBe('numeric')
            ->and($productSpecColumns->get('value_number')?->numeric_precision)->toBe(14)
            ->and($productSpecColumns->get('value_number')?->numeric_scale)->toBe(4)
            ->and($productSpecColumns->get('value_number')?->is_nullable)->toBe('YES')
            ->and($productSpecColumns->get('value_bool')?->data_type)->toBe('boolean')
            ->and($productSpecColumns->get('value_bool')?->is_nullable)->toBe('YES');

        $priceHistoryColumns = collect(DB::select(
            "SELECT column_name, data_type, numeric_precision, numeric_scale, is_nullable
             FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'price_history'"
        ))->keyBy('column_name');

        expect($priceHistoryColumns->get('price')?->data_type)->toBe('numeric')
            ->and($priceHistoryColumns->get('price')?->numeric_precision)->toBe(12)
            ->and($priceHistoryColumns->get('price')?->numeric_scale)->toBe(2)
            ->and($priceHistoryColumns->get('recorded_at')?->data_type)->toBe('date');
    }
});

test('spec_definitions applies expected default column values', function (): void {
    $now = now();

    $categoryId = DB::table('categories')->insertGetId([
        'name' => 'Keyboards',
        'slug' => 'keyboards',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $specDefinitionId = DB::table('spec_definitions')->insertGetId([
        'category_id' => $categoryId,
        'key' => 'switch_type',
        'label' => 'Switch Type',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $specDefinition = DB::table('spec_definitions')->where('id', $specDefinitionId)->first();

    expect($specDefinition)->not->toBeNull()
        ->and($specDefinition?->unit)->toBeNull()
        ->and($specDefinition?->data_type)->toBe(SpecDataType::Text->value)
        ->and((bool) $specDefinition?->is_filterable)->toBeFalse()
        ->and((bool) $specDefinition?->is_comparable)->toBeFalse()
        ->and($specDefinition?->higher_is_better)->toBeNull()
        ->and((int) $specDefinition?->sort_order)->toBe(0);
});

test('spec_definitions, product_specs, and price_history enforce constraints and cascade deletes', function (): void {
    $now = now();

    $laptopsCategoryId = DB::table('categories')->insertGetId([
        'name' => 'Laptops',
        'slug' => 'laptops',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $monitorsCategoryId = DB::table('categories')->insertGetId([
        'name' => 'Monitors',
        'slug' => 'monitors',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $brandId = DB::table('brands')->insertGetId([
        'name' => 'Dell',
        'slug' => 'dell',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $productId = DB::table('products')->insertGetId([
        'category_id' => $laptopsCategoryId,
        'brand_id' => $brandId,
        'name' => 'XPS 15',
        'slug' => 'xps-15',
        'summary' => 'Creator laptop with OLED display',
        'description' => 'Full specification test product.',
        'price' => '149999.00',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $ramSpecId = DB::table('spec_definitions')->insertGetId([
        'category_id' => $laptopsCategoryId,
        'key' => 'ram_gb',
        'label' => 'RAM',
        'unit' => 'GB',
        'data_type' => SpecDataType::Number->value,
        'is_filterable' => true,
        'is_comparable' => true,
        'higher_is_better' => true,
        'sort_order' => 1,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $weightSpecId = DB::table('spec_definitions')->insertGetId([
        'category_id' => $laptopsCategoryId,
        'key' => 'weight_kg',
        'label' => 'Weight',
        'unit' => 'kg',
        'data_type' => SpecDataType::Number->value,
        'is_filterable' => false,
        'is_comparable' => true,
        'higher_is_better' => false,
        'sort_order' => 2,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    // Same spec key in a different category is allowed.
    $monitorWeightSpecId = DB::table('spec_definitions')->insertGetId([
        'category_id' => $monitorsCategoryId,
        'key' => 'weight_kg',
        'label' => 'Weight',
        'unit' => 'kg',
        'data_type' => SpecDataType::Number->value,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    expect($monitorWeightSpecId)->toBeInt();

    // Duplicate (category_id, key) fails.
    expect(fn () => DB::transaction(static fn () => DB::table('spec_definitions')->insert([
        'category_id' => $laptopsCategoryId,
        'key' => 'ram_gb',
        'label' => 'Memory',
        'data_type' => SpecDataType::Number->value,
        'created_at' => $now,
        'updated_at' => $now,
    ])))->toThrow(QueryException::class);

    $ramProductSpecId = DB::table('product_specs')->insertGetId([
        'product_id' => $productId,
        'spec_definition_id' => $ramSpecId,
        'value_number' => '32.0000',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $weightProductSpecId = DB::table('product_specs')->insertGetId([
        'product_id' => $productId,
        'spec_definition_id' => $weightSpecId,
        'value_number' => '1.8600',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    // Duplicate (product_id, spec_definition_id) fails.
    expect(fn () => DB::transaction(static fn () => DB::table('product_specs')->insert([
        'product_id' => $productId,
        'spec_definition_id' => $ramSpecId,
        'value_number' => '64.0000',
        'created_at' => $now,
        'updated_at' => $now,
    ])))->toThrow(QueryException::class);

    // Multiple price_history rows for the same product on the same date are allowed (e.g. multiple admin price edits).
    $firstPriceId = DB::table('price_history')->insertGetId([
        'product_id' => $productId,
        'price' => '154999.00',
        'recorded_at' => '2026-11-11',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $secondPriceId = DB::table('price_history')->insertGetId([
        'product_id' => $productId,
        'price' => '149999.00',
        'recorded_at' => '2026-11-11',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    expect($firstPriceId)->not->toBe($secondPriceId);

    // Deleting a spec_definition cascades to its product_specs.
    DB::table('spec_definitions')->where('id', $weightSpecId)->delete();
    expect(DB::table('product_specs')->where('id', $weightProductSpecId)->exists())->toBeFalse()
        ->and(DB::table('product_specs')->where('id', $ramProductSpecId)->exists())->toBeTrue();

    // Deleting a product cascades to its product_specs and price_history.
    DB::table('products')->where('id', $productId)->delete();
    expect(DB::table('product_specs')->where('id', $ramProductSpecId)->exists())->toBeFalse()
        ->and(DB::table('price_history')->whereIn('id', [$firstPriceId, $secondPriceId])->exists())->toBeFalse();

    // Deleting a category cascades to its spec_definitions.
    DB::table('categories')->where('id', $monitorsCategoryId)->delete();
    expect(DB::table('spec_definitions')->where('id', $monitorWeightSpecId)->exists())->toBeFalse();
});

test('spec_definitions, product_specs, and price_history migrations roll back and re-apply cleanly', function (): void {
    $allMigrationFiles = glob(database_path('migrations/*.php')) ?: [];
    sort($allMigrationFiles);

    $migrationFiles = array_values(array_filter(
        $allMigrationFiles,
        static fn (string $path): bool => basename($path) >= '2026_11_11_151500_create_spec_definitions_table.php',
    ));

    /** @var list<Migration> $migrations */
    $migrations = array_values(array_filter(
        array_map(
            static fn (string $path): Migration => require $path,
            $migrationFiles,
        ),
        static fn (Migration $migration): bool => $migration->shouldRun(),
    ));

    foreach (array_reverse($migrations) as $migration) {
        $migration->down();
    }

    expect(Schema::hasTable('price_history'))->toBeFalse()
        ->and(Schema::hasTable('product_specs'))->toBeFalse()
        ->and(Schema::hasTable('spec_definitions'))->toBeFalse();

    foreach ($migrations as $migration) {
        $migration->up();
    }

    expect(Schema::hasTable('spec_definitions'))->toBeTrue()
        ->and(Schema::hasTable('product_specs'))->toBeTrue()
        ->and(Schema::hasTable('price_history'))->toBeTrue();
});
