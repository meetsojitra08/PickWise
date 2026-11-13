<?php

declare(strict_types=1);

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductSpec;
use App\Models\SpecDefinition;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('compare endpoint returns an ordered spec matrix with per-row winners', function (): void {
    $category = Category::factory()->create(['name' => 'Laptops', 'slug' => 'laptops']);
    $brand = Brand::factory()->create(['name' => 'Lenovo', 'slug' => 'lenovo']);

    $alpha = Product::factory()->for($category)->for($brand)->create([
        'name' => 'Alpha 14',
        'slug' => 'alpha-14',
        'price' => '74999.00',
    ]);
    $beta = Product::factory()->for($category)->for($brand)->create([
        'name' => 'Beta 15',
        'slug' => 'beta-15',
        'price' => '99999.00',
    ]);
    $gamma = Product::factory()->for($category)->for($brand)->create([
        'name' => 'Gamma 16',
        'slug' => 'gamma-16',
        'price' => '129999.00',
    ]);

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
    $touch = SpecDefinition::factory()->for($category)->boolean()->comparable()->create([
        'key' => 'touchscreen',
        'label' => 'Touchscreen',
        'sort_order' => 4,
    ]);
    $panel = SpecDefinition::factory()->for($category)->text()->comparable()->create([
        'key' => 'panel',
        'label' => 'Panel',
        'sort_order' => 5,
    ]);
    $refresh = SpecDefinition::factory()->for($category)->numeric('Hz', null)->comparable()->create([
        'key' => 'refresh_hz',
        'label' => 'Refresh rate',
        'sort_order' => 6,
    ]);
    SpecDefinition::factory()->for($category)->numeric('GB', true)->comparable()->create([
        'key' => 'empty_spec',
        'label' => 'Empty spec',
        'sort_order' => 7,
    ]);
    $notComparable = SpecDefinition::factory()->for($category)->numeric('mm', true)->create([
        'key' => 'thickness_mm',
        'label' => 'Thickness',
        'sort_order' => 8,
    ]);

    $numericValues = [
        [$alpha, $ram, 16.0],
        [$beta, $ram, 32.0],
        [$gamma, $ram, 24.0],
        [$alpha, $weight, 1.4],
        [$beta, $weight, 1.6],
        [$gamma, $weight, 1.8],
        [$alpha, $refresh, 60.0],
        [$beta, $refresh, 120.0],
        [$gamma, $refresh, 144.0],
        [$alpha, $notComparable, 18.0],
    ];

    foreach ($numericValues as [$product, $definition, $value]) {
        ProductSpec::factory()->for($product)->for($definition, 'specDefinition')->numericValue($value)->create();
    }

    foreach ([[$alpha, $gpu, false], [$beta, $gpu, true], [$gamma, $gpu, false]] as [$product, $definition, $value]) {
        ProductSpec::factory()->for($product)->for($definition, 'specDefinition')->booleanValue($value)->create();
    }

    ProductSpec::factory()->for($beta)->for($touch, 'specDefinition')->booleanValue(true)->create();

    foreach ([[$alpha, $panel, 'OLED'], [$beta, $panel, 'IPS'], [$gamma, $panel, 'OLED']] as [$product, $definition, $value]) {
        ProductSpec::factory()->for($product)->for($definition, 'specDefinition')->textValue($value)->create();
    }

    $this->postJson('/api/v1/compare', ['product_ids' => [$gamma->id, $alpha->id, $beta->id]])
        ->assertOk()
        ->assertHeader('X-RateLimit-Limit', '120')
        ->assertJsonCount(3, 'data.products')
        ->assertJsonCount(6, 'data.rows')
        ->assertJsonPath('data.category.id', $category->id)
        ->assertJsonPath('data.category.name', 'Laptops')
        ->assertJsonPath('data.category.slug', 'laptops')
        ->assertJsonPath('data.products.0.id', $gamma->id)
        ->assertJsonPath('data.products.1.id', $alpha->id)
        ->assertJsonPath('data.products.2.id', $beta->id)
        ->assertJsonPath('data.products.0.price.amount', '129999.00')
        ->assertJsonPath('data.products.0.price.currency', 'INR')
        ->assertJsonPath('data.products.0.brand.slug', 'lenovo')
        ->assertJsonPath('data.rows.0.key', 'ram_gb')
        ->assertJsonPath('data.rows.0.label', 'RAM')
        ->assertJsonPath('data.rows.0.unit', 'GB')
        ->assertJsonPath('data.rows.0.data_type', 'number')
        ->assertJsonPath('data.rows.0.higher_is_better', true)
        ->assertJsonPath('data.rows.0.winner_product_id', $beta->id)
        ->assertJsonPath('data.rows.0.values.0.product_id', $gamma->id)
        ->assertJsonPath('data.rows.0.values.0.value', 24)
        ->assertJsonPath('data.rows.0.values.1.product_id', $alpha->id)
        ->assertJsonPath('data.rows.0.values.1.value', 16)
        ->assertJsonPath('data.rows.0.values.2.product_id', $beta->id)
        ->assertJsonPath('data.rows.0.values.2.value', 32)
        ->assertJsonPath('data.rows.1.key', 'weight_kg')
        ->assertJsonPath('data.rows.1.higher_is_better', false)
        ->assertJsonPath('data.rows.1.winner_product_id', $alpha->id)
        ->assertJsonPath('data.rows.2.key', 'dedicated_gpu')
        ->assertJsonPath('data.rows.2.winner_product_id', $beta->id)
        ->assertJsonPath('data.rows.3.key', 'touchscreen')
        ->assertJsonPath('data.rows.3.values.0.value', null)
        ->assertJsonPath('data.rows.3.values.1.value', null)
        ->assertJsonPath('data.rows.3.values.2.value', true)
        ->assertJsonPath('data.rows.3.winner_product_id', $beta->id)
        ->assertJsonPath('data.rows.4.key', 'panel')
        ->assertJsonPath('data.rows.4.higher_is_better', null)
        ->assertJsonPath('data.rows.4.winner_product_id', null)
        ->assertJsonPath('data.rows.5.key', 'refresh_hz')
        ->assertJsonPath('data.rows.5.winner_product_id', null);
});

test('compare endpoint validates two to four distinct available products', function (): void {
    $category = Category::factory()->create();
    $products = Product::factory()->count(5)->for($category)->create();
    $unpublished = Product::factory()->for($category)->unpublished()->create();
    $removed = Product::factory()->for($category)->create();
    $removed->delete();

    $this->postJson('/api/v1/compare', [])
        ->assertUnprocessable()
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonPath('error.details.product_ids.0', 'Choose two to four products to compare.');

    $this->postJson('/api/v1/compare', ['product_ids' => [$products[0]->id]])
        ->assertUnprocessable()
        ->assertJsonPath('error.details.product_ids.0', 'Choose at least two products to compare.');

    $this->postJson('/api/v1/compare', ['product_ids' => $products->pluck('id')->all()])
        ->assertUnprocessable()
        ->assertJsonPath('error.details.product_ids.0', 'You can compare up to four products at a time.');

    $this->postJson('/api/v1/compare', ['product_ids' => [$products[0]->id, $products[0]->id]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('product_ids.1', 'error.details');

    $this->postJson('/api/v1/compare', ['product_ids' => ['not-a-number', $products[1]->id]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('product_ids.0', 'error.details');

    $this->postJson('/api/v1/compare', ['product_ids' => [$unpublished->id, $products[0]->id]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            ['product_ids.0' => 'This product is not available to compare.'],
            'error.details',
        );

    $this->postJson('/api/v1/compare', ['product_ids' => [$removed->id, $products[0]->id]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            ['product_ids.0' => 'This product is not available to compare.'],
            'error.details',
        );

    $this->postJson('/api/v1/compare', ['product_ids' => [999999, $products[0]->id]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            ['product_ids.0' => 'This product is not available to compare.'],
            'error.details',
        );
});

test('compare endpoint blocks products from different categories with a clear message', function (): void {
    $laptops = Category::factory()->create(['slug' => 'laptops']);
    $headphonesCategory = Category::factory()->create(['slug' => 'headphones']);

    $laptop = Product::factory()->for($laptops)->create();
    $headphones = Product::factory()->for($headphonesCategory)->create();

    $this->postJson('/api/v1/compare', ['product_ids' => [$laptop->id, $headphones->id]])
        ->assertUnprocessable()
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonPath('error.details.product_ids.0', 'Products from different categories cannot be compared.');
});

test('compare endpoint hides products from inactive categories', function (): void {
    $inactive = Category::factory()->inactive()->create();
    $first = Product::factory()->for($inactive)->create();
    $second = Product::factory()->for($inactive)->create();

    $this->postJson('/api/v1/compare', ['product_ids' => [$first->id, $second->id]])
        ->assertUnprocessable()
        ->assertJsonPath('error.details.product_ids.0', 'One or more products are not available to compare.');
});
