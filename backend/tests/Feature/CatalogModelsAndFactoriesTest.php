<?php

declare(strict_types=1);

use App\Enums\ProductAvailability;
use App\Enums\SpecDataType;
use App\Models\Brand;
use App\Models\Category;
use App\Models\PriceHistory;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductSpec;
use App\Models\SpecDefinition;
use Carbon\CarbonInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('category model applies defaults, self-referential hierarchy, relationships, scopes, and factory states', function (): void {
    $parent = Category::factory()->create([
        'name' => 'Computers',
        'slug' => 'computers',
        'sort_order' => 2,
    ]);

    $earlierRoot = Category::factory()->create([
        'name' => 'Audio',
        'slug' => 'audio',
        'sort_order' => 1,
    ]);

    $inactiveRoot = Category::factory()->inactive()->create([
        'name' => 'Legacy',
        'slug' => 'legacy',
        'sort_order' => 0,
    ]);

    $childSecond = Category::factory()->childOf($parent)->create([
        'name' => 'Desktops',
        'slug' => 'desktops',
        'sort_order' => 2,
    ]);

    $childFirst = Category::factory()->childOf($parent)->create([
        'name' => 'Laptops',
        'slug' => 'laptops',
        'sort_order' => 1,
    ]);

    $autoParentChild = Category::factory()->childOf()->create();

    $defaulted = Category::create([
        'name' => 'Monitors',
        'slug' => 'monitors',
    ]);

    expect($defaulted->sort_order)->toBe(0)
        ->and($defaulted->is_active)->toBeTrue()
        ->and($inactiveRoot->is_active)->toBeFalse()
        ->and($autoParentChild->parent)->toBeInstanceOf(Category::class)
        ->and($childFirst->parent?->is($parent))->toBeTrue();

    $parent->load('children');
    expect($parent->children->pluck('id')->all())->toBe([$childFirst->id, $childSecond->id]);

    $orderedActiveRoots = Category::query()
        ->root()
        ->active()
        ->ordered()
        ->pluck('slug')
        ->all();

    expect($orderedActiveRoots)->toContain('audio', 'computers', 'monitors')
        ->not->toContain('legacy', 'laptops', 'desktops')
        ->and(array_search('audio', $orderedActiveRoots, true))
        ->toBeLessThan(array_search('computers', $orderedActiveRoots, true));
});

test('brand model relates to products and factory supports optional logo', function (): void {
    $plainBrand = Brand::factory()->create(['name' => 'Logitech', 'slug' => 'logitech']);
    $logoBrand = Brand::factory()->withLogo()->create(['name' => 'Sony', 'slug' => 'sony']);
    $customLogoBrand = Brand::factory()->withLogo('brands/apple-mark.svg')->create();

    $product = Product::factory()->for($logoBrand)->create();

    expect($plainBrand->logo_path)->toBeNull()
        ->and($logoBrand->logo_path)->toBe('brands/sony.svg')
        ->and($customLogoBrand->logo_path)->toBe('brands/apple-mark.svg')
        ->and($logoBrand->products)->toHaveCount(1)
        ->and($logoBrand->products->first()?->is($product))->toBeTrue();
});

test('product model enforces fillable boundaries, casts, hidden fields, soft deletes, scopes, and factory states', function (): void {
    $category = Category::factory()->create();
    $brand = Brand::factory()->create();

    $created = Product::create([
        'category_id' => $category->id,
        'brand_id' => $brand->id,
        'name' => 'ThinkPad X1 Carbon',
        'slug' => 'thinkpad-x1-carbon',
        'summary' => 'Featherweight business laptop.',
        'description' => 'Detailed description for ThinkPad X1 Carbon.',
        'price' => '139999.50',
        'rating_avg' => 4.9,
        'rating_count' => 999,
        'value_score' => 98,
        'search_vector' => 'tampered',
    ]);

    $fresh = $created->fresh();

    expect($fresh)->not->toBeNull()
        ->and($fresh?->price)->toBe('139999.50')
        ->and($fresh?->currency)->toBe('INR')
        ->and($fresh?->availability)->toBe(ProductAvailability::InStock)
        ->and($fresh?->rating_avg)->toBe(0.0)
        ->and($fresh?->rating_count)->toBe(0)
        ->and($fresh?->value_score)->toBeNull()
        ->and($fresh?->is_published)->toBeTrue()
        ->and(array_key_exists('search_vector', $fresh?->toArray() ?? []))->toBeFalse();

    $fresh?->fill([
        'name' => 'ThinkPad X1 Carbon Gen 12',
        'rating_avg' => 5.0,
        'rating_count' => 50,
        'value_score' => 99,
    ])->save();

    $afterFill = $fresh?->fresh();

    expect($afterFill?->name)->toBe('ThinkPad X1 Carbon Gen 12')
        ->and($afterFill?->rating_avg)->toBe(0.0)
        ->and($afterFill?->rating_count)->toBe(0)
        ->and($afterFill?->value_score)->toBeNull();

    $unpublished = Product::factory()->unpublished()->create();
    $lowStock = Product::factory()->lowStock()->create();
    $outOfStock = Product::factory()->outOfStock()->create();
    $rated = Product::factory()->withRating(4.35, 24)->withValueScore(88)->create();
    $trashed = Product::factory()->trashed()->create();

    expect($unpublished->is_published)->toBeFalse()
        ->and($lowStock->availability)->toBe(ProductAvailability::LowStock)
        ->and($outOfStock->availability)->toBe(ProductAvailability::OutOfStock)
        ->and($rated->rating_avg)->toBe(4.35)
        ->and($rated->rating_count)->toBe(24)
        ->and($rated->value_score)->toBe(88)
        ->and($trashed->trashed())->toBeTrue();

    $publishedIds = Product::query()->published()->pluck('id')->all();

    expect($publishedIds)->toContain($created->id, $lowStock->id, $outOfStock->id, $rated->id)
        ->not->toContain($unpublished->id, $trashed->id);

    $rated->delete();
    expect(Product::query()->find($rated->id))->toBeNull()
        ->and(Product::withTrashed()->find($rated->id))->not->toBeNull();

    $rated->restore();
    expect(Product::query()->find($rated->id))->not->toBeNull();
});

test('product relationships eager load images, primary image, specs, and chronological price history without errors', function (): void {
    $category = Category::factory()->create();
    $brand = Brand::factory()->create();
    $product = Product::factory()->for($category)->for($brand)->create();
    $productWithoutPrimary = Product::factory()->for($category)->for($brand)->create();

    $gallerySecond = ProductImage::factory()->for($product)->create([
        'sort_order' => 2,
        'is_primary' => false,
    ]);
    $galleryFirst = ProductImage::factory()->for($product)->create([
        'sort_order' => 1,
        'is_primary' => false,
    ]);
    $primaryImage = ProductImage::factory()->for($product)->primary()->create([
        'sort_order' => 5,
    ]);

    ProductImage::factory()->for($productWithoutPrimary)->create([
        'is_primary' => false,
    ]);

    $specDef = SpecDefinition::factory()->for($category)->numeric('GB', true)->create([
        'key' => 'ram_gb',
        'label' => 'RAM',
    ]);
    $productSpec = ProductSpec::factory()
        ->for($product)
        ->for($specDef)
        ->numericValue(16)
        ->create();

    $newerHistory = PriceHistory::factory()->for($product)->recordedOn('2026-10-01')->create([
        'price' => '79999.00',
    ]);
    $olderHistory = PriceHistory::factory()->for($product)->recordedOn('2026-08-01')->create([
        'price' => '84999.00',
    ]);

    $loaded = Product::query()
        ->with(['category', 'brand', 'images', 'primaryImage', 'specs.specDefinition', 'priceHistory'])
        ->withCount(['images', 'specs', 'priceHistory'])
        ->findOrFail($product->id);

    expect($loaded->category?->is($category))->toBeTrue()
        ->and($loaded->brand?->is($brand))->toBeTrue()
        ->and($loaded->images->pluck('id')->all())->toBe([$primaryImage->id, $galleryFirst->id, $gallerySecond->id])
        ->and($loaded->primaryImage?->is($primaryImage))->toBeTrue()
        ->and($loaded->specs)->toHaveCount(1)
        ->and($loaded->specs->first()?->is($productSpec))->toBeTrue()
        ->and($loaded->priceHistory->pluck('id')->all())->toBe([$olderHistory->id, $newerHistory->id])
        ->and($loaded->images_count)->toBe(3)
        ->and($loaded->specs_count)->toBe(1)
        ->and($loaded->price_history_count)->toBe(2);

    $loadedNoPrimary = Product::query()->with('primaryImage')->findOrFail($productWithoutPrimary->id);
    expect($loadedNoPrimary->primaryImage)->toBeNull();
});

test('spec definition, product spec, and price history models handle casts, scopes, value lookup, and table mapping', function (): void {
    $category = Category::factory()->create();

    $defaultSpec = SpecDefinition::create([
        'category_id' => $category->id,
        'key' => 'chassis_material',
        'label' => 'Chassis Material',
    ]);

    $ramSpec = SpecDefinition::factory()
        ->for($category)
        ->numeric('GB', true)
        ->filterable()
        ->comparable()
        ->create([
            'key' => 'ram_gb',
            'label' => 'RAM',
            'sort_order' => 2,
        ]);

    $weightSpec = SpecDefinition::factory()
        ->for($category)
        ->numeric('kg', false)
        ->comparable()
        ->create([
            'key' => 'weight_kg',
            'label' => 'Weight',
            'sort_order' => 1,
        ]);

    $neutralComparableSpec = SpecDefinition::factory()
        ->for($category)
        ->boolean(true)
        ->comparable(null)
        ->create([
            'key' => 'touchscreen',
            'label' => 'Touchscreen',
            'sort_order' => 3,
        ]);

    $textSpecDef = SpecDefinition::factory()
        ->for($category)
        ->text()
        ->create([
            'key' => 'display_panel',
            'label' => 'Display Panel',
            'sort_order' => 4,
        ]);

    expect($defaultSpec->data_type)->toBe(SpecDataType::Text)
        ->and($defaultSpec->is_filterable)->toBeFalse()
        ->and($defaultSpec->is_comparable)->toBeFalse()
        ->and($defaultSpec->higher_is_better)->toBeNull()
        ->and($defaultSpec->sort_order)->toBe(0)
        ->and($ramSpec->data_type)->toBe(SpecDataType::Number)
        ->and($ramSpec->higher_is_better)->toBeTrue()
        ->and($weightSpec->higher_is_better)->toBeFalse()
        ->and($neutralComparableSpec->data_type)->toBe(SpecDataType::Boolean)
        ->and($neutralComparableSpec->higher_is_better)->toBeNull()
        ->and($category->specDefinitions->pluck('key')->all())->toBe([
            'chassis_material',
            'weight_kg',
            'ram_gb',
            'touchscreen',
            'display_panel',
        ]);

    expect(SpecDefinition::query()->where('category_id', $category->id)->filterable()->pluck('key')->all())
        ->toBe(['ram_gb']);

    expect(SpecDefinition::query()->where('category_id', $category->id)->comparable()->ordered()->pluck('key')->all())
        ->toBe(['weight_kg', 'ram_gb', 'touchscreen']);

    $product = Product::factory()->for($category)->create();

    $numericSpec = ProductSpec::factory()->for($product)->for($weightSpec)->numericValue(1.42)->create();
    $boolSpec = ProductSpec::factory()->for($product)->for($neutralComparableSpec)->booleanValue(true)->create();
    $textSpec = ProductSpec::factory()->for($product)->for($textSpecDef)->textValue('OLED 120Hz')->create();

    expect($numericSpec->value_number)->toBe(1.42)
        ->and($numericSpec->value_text)->toBeNull()
        ->and($numericSpec->value_bool)->toBeNull()
        ->and($numericSpec->valueFor(SpecDataType::Number))->toBe(1.42)
        ->and($numericSpec->specDefinition?->is($weightSpec))->toBeTrue()
        ->and($numericSpec->product?->is($product))->toBeTrue()
        ->and($weightSpec->productSpecs)->toHaveCount(1);

    expect($boolSpec->value_bool)->toBeTrue()
        ->and($boolSpec->value_text)->toBeNull()
        ->and($boolSpec->value_number)->toBeNull()
        ->and($boolSpec->valueFor(SpecDataType::Boolean))->toBeTrue();

    expect($textSpec->value_text)->toBe('OLED 120Hz')
        ->and($textSpec->value_number)->toBeNull()
        ->and($textSpec->value_bool)->toBeNull()
        ->and($textSpec->valueFor(SpecDataType::Text))->toBe('OLED 120Hz');

    $history = PriceHistory::factory()->for($product)->recordedOn('2026-09-15')->create([
        'price' => '99990.00',
    ]);

    expect($history->getTable())->toBe('price_history')
        ->and($history->price)->toBe('99990.00')
        ->and($history->recorded_at)->toBeInstanceOf(CarbonInterface::class)
        ->and($history->recorded_at?->toDateString())->toBe('2026-09-15')
        ->and($history->product?->is($product))->toBeTrue();
});
