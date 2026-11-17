<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\ProductAvailability;
use App\Enums\SpecDataType;
use App\Enums\UserRole;
use App\Models\AdminActivityLog;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductSpec;
use App\Models\SpecDefinition;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('rejects unauthenticated requests to category management', function (): void {
    $this->getJson('/api/v1/admin/categories')->assertUnauthorized();
    $this->postJson('/api/v1/admin/categories', ['name' => 'Audio'])->assertUnauthorized();
});

it('rejects non-admin customers from managing categories', function (): void {
    $customer = User::factory()->create([
        'role' => UserRole::Customer,
        'is_active' => true,
    ]);

    $this->actingAs($customer)
        ->getJson('/api/v1/admin/categories')
        ->assertForbidden();

    $this->actingAs($customer)
        ->postJson('/api/v1/admin/categories', ['name' => 'Audio'])
        ->assertForbidden();
});

it('rejects deactivated admins from managing categories', function (): void {
    $inactiveAdmin = User::factory()->admin()->inactive()->create();

    $this->actingAs($inactiveAdmin)
        ->getJson('/api/v1/admin/categories')
        ->assertForbidden();
});

it('lists categories with search, active filter, and aggregated counts', function (): void {
    $admin = User::factory()->admin()->create();

    $root = Category::factory()->create(['name' => 'Computing', 'slug' => 'computing', 'sort_order' => 1]);
    $child = Category::factory()->create(['name' => 'Laptops', 'slug' => 'laptops', 'parent_id' => $root->id, 'sort_order' => 2]);
    $inactive = Category::factory()->inactive()->create(['name' => 'Wearables', 'slug' => 'wearables']);

    $brand = Brand::factory()->create();
    Product::factory()->create([
        'category_id' => $child->id,
        'brand_id' => $brand->id,
        'availability' => ProductAvailability::InStock,
    ]);
    SpecDefinition::factory()->create([
        'category_id' => $child->id,
        'key' => 'ram_gb',
        'data_type' => SpecDataType::Number,
    ]);

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/categories');

    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'parent_id',
                    'parent',
                    'name',
                    'slug',
                    'description',
                    'image_path',
                    'image_url',
                    'sort_order',
                    'is_active',
                    'products_count',
                    'spec_definitions_count',
                    'children_count',
                    'created_at',
                    'updated_at',
                ],
            ],
            'links',
            'meta',
        ]);

    // Test search filter
    $searchRes = $this->actingAs($admin)->getJson('/api/v1/admin/categories?search=Laptop');
    $searchRes->assertOk();
    expect($searchRes->json('data'))->toHaveCount(1)
        ->and($searchRes->json('data.0.slug'))->toBe('laptops')
        ->and($searchRes->json('data.0.products_count'))->toBe(1)
        ->and($searchRes->json('data.0.spec_definitions_count'))->toBe(1);

    // Test is_active filter
    $activeRes = $this->actingAs($admin)->getJson('/api/v1/admin/categories?is_active=0');
    $activeRes->assertOk();
    expect($activeRes->json('data'))->toHaveCount(1)
        ->and($activeRes->json('data.0.slug'))->toBe('wearables');
});

it('creates a new category, generates slug, and logs audit record', function (): void {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin)->postJson('/api/v1/admin/categories', [
        'name' => 'Smart Home',
        'description' => 'Connected devices and automation',
        'sort_order' => 5,
        'is_active' => true,
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Smart Home')
        ->assertJsonPath('data.slug', 'smart-home')
        ->assertJsonPath('data.sort_order', 5)
        ->assertJsonPath('data.products_count', 0)
        ->assertJsonPath('data.spec_definitions_count', 0);

    $category = Category::query()->where('slug', 'smart-home')->first();
    expect($category)->not->toBeNull();

    $log = AdminActivityLog::query()->latest('id')->first();
    expect($log)->not->toBeNull()
        ->and($log->action)->toBe('category.created')
        ->and($log->admin_id)->toBe($admin->id)
        ->and($log->subject_id)->toBe($category->id)
        ->and($log->changes['after']['name'])->toBe('Smart Home');
});

it('validates category creation inputs', function (): void {
    $admin = User::factory()->admin()->create();
    Category::factory()->create(['slug' => 'existing-slug']);

    $response = $this->actingAs($admin)->postJson('/api/v1/admin/categories', [
        'name' => 'A', // too short
        'slug' => 'existing-slug',
        'parent_id' => 99999,
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'slug', 'parent_id'], 'error.details');
});

it('updates an existing category and records before/after diff in audit log', function (): void {
    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create([
        'name' => 'Old Name',
        'slug' => 'old-slug',
        'sort_order' => 1,
    ]);

    $response = $this->actingAs($admin)->patchJson("/api/v1/admin/categories/{$category->id}", [
        'name' => 'New Name',
        'sort_order' => 10,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.name', 'New Name')
        ->assertJsonPath('data.sort_order', 10);

    $category->refresh();
    expect($category->name)->toBe('New Name')
        ->and($category->sort_order)->toBe(10);

    $log = AdminActivityLog::query()->latest('id')->first();
    expect($log)->not->toBeNull()
        ->and($log->action)->toBe('category.updated')
        ->and($log->changes['before']['name'])->toBe('Old Name')
        ->and($log->changes['after']['name'])->toBe('New Name')
        ->and($log->changes['before']['sort_order'])->toBe(1)
        ->and($log->changes['after']['sort_order'])->toBe(10);
});

it('prevents setting category parent to itself or a descendant', function (): void {
    $admin = User::factory()->admin()->create();
    $parent = Category::factory()->create(['name' => 'Parent']);
    $child = Category::factory()->create(['name' => 'Child', 'parent_id' => $parent->id]);

    // Cannot set parent to itself
    $res1 = $this->actingAs($admin)->patchJson("/api/v1/admin/categories/{$parent->id}", [
        'parent_id' => $parent->id,
    ]);
    $res1->assertUnprocessable()->assertJsonValidationErrors(['parent_id'], 'error.details');

    // Cannot set parent to its child
    $res2 = $this->actingAs($admin)->patchJson("/api/v1/admin/categories/{$parent->id}", [
        'parent_id' => $child->id,
    ]);
    $res2->assertUnprocessable()->assertJsonValidationErrors(['parent_id'], 'error.details');
});

it('deletes an empty category and records audit deletion', function (): void {
    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create(['name' => 'Temporary']);

    $response = $this->actingAs($admin)->deleteJson("/api/v1/admin/categories/{$category->id}");
    $response->assertNoContent();

    expect(Category::query()->find($category->id))->toBeNull();

    $log = AdminActivityLog::query()->latest('id')->first();
    expect($log)->not->toBeNull()
        ->and($log->action)->toBe('category.deleted')
        ->and($log->subject_id)->toBe($category->id)
        ->and($log->changes['before']['name'])->toBe('Temporary');
});

it('prevents deleting a category that has associated products', function (): void {
    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create();
    $brand = Brand::factory()->create();
    Product::factory()->create([
        'category_id' => $category->id,
        'brand_id' => $brand->id,
    ]);

    $response = $this->actingAs($admin)->deleteJson("/api/v1/admin/categories/{$category->id}");

    $response->assertUnprocessable()
        ->assertJsonPath('error.code', 'validation_failed');

    expect(Category::query()->find($category->id))->not->toBeNull();
});

it('manages spec definitions for a category with full CRUD and cascade', function (): void {
    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create(['name' => 'Laptops']);
    $otherCategory = Category::factory()->create(['name' => 'Smartphones']);

    // 1. Create spec definition
    $createRes = $this->actingAs($admin)->postJson("/api/v1/admin/categories/{$category->id}/specs", [
        'key' => 'ram_gb',
        'label' => 'RAM',
        'unit' => 'GB',
        'data_type' => 'number',
        'is_filterable' => true,
        'is_comparable' => true,
        'higher_is_better' => true,
        'sort_order' => 1,
    ]);

    $createRes->assertCreated()
        ->assertJsonPath('data.key', 'ram_gb')
        ->assertJsonPath('data.label', 'RAM')
        ->assertJsonPath('data.unit', 'GB')
        ->assertJsonPath('data.data_type', 'number')
        ->assertJsonPath('data.is_filterable', true)
        ->assertJsonPath('data.is_comparable', true)
        ->assertJsonPath('data.higher_is_better', true)
        ->assertJsonPath('data.product_specs_count', 0);

    $specId = $createRes->json('data.id');

    // Verify audit log for creation
    $createLog = AdminActivityLog::query()->latest('id')->first();
    expect($createLog)->not->toBeNull()
        ->and($createLog->action)->toBe('spec_definition.created')
        ->and($createLog->subject_id)->toBe($specId);

    // 2. Reject duplicate key within same category
    $dupRes = $this->actingAs($admin)->postJson("/api/v1/admin/categories/{$category->id}/specs", [
        'key' => 'ram_gb',
        'label' => 'RAM Duplicate',
        'data_type' => 'number',
    ]);
    $dupRes->assertUnprocessable()->assertJsonValidationErrors(['key'], 'error.details');

    // But same key is allowed in another category
    $otherCatRes = $this->actingAs($admin)->postJson("/api/v1/admin/categories/{$otherCategory->id}/specs", [
        'key' => 'ram_gb',
        'label' => 'RAM Phone',
        'data_type' => 'number',
    ]);
    $otherCatRes->assertCreated();

    // 3. Index spec definitions
    $indexRes = $this->actingAs($admin)->getJson("/api/v1/admin/categories/{$category->id}/specs");
    $indexRes->assertOk();
    expect($indexRes->json('data'))->toHaveCount(1)
        ->and($indexRes->json('data.0.key'))->toBe('ram_gb');

    // 4. Update spec definition
    $updateRes = $this->actingAs($admin)->patchJson("/api/v1/admin/categories/{$category->id}/specs/{$specId}", [
        'label' => 'System Memory',
        'unit' => 'Gigabytes',
    ]);
    $updateRes->assertOk()
        ->assertJsonPath('data.label', 'System Memory')
        ->assertJsonPath('data.unit', 'Gigabytes');

    $updateLog = AdminActivityLog::query()->latest('id')->first();
    expect($updateLog->action)->toBe('spec_definition.updated')
        ->and($updateLog->changes['before']['label'])->toBe('RAM')
        ->and($updateLog->changes['after']['label'])->toBe('System Memory');

    // 5. Scoped route protection: cannot access laptop spec via smartphone category URL
    $this->actingAs($admin)
        ->getJson("/api/v1/admin/categories/{$otherCategory->id}/specs/{$specId}")
        ->assertNotFound();

    // 6. Delete spec definition and cascade
    $brand = Brand::factory()->create();
    $product = Product::factory()->create([
        'category_id' => $category->id,
        'brand_id' => $brand->id,
    ]);
    $productSpec = ProductSpec::factory()->create([
        'product_id' => $product->id,
        'spec_definition_id' => $specId,
        'value_number' => 16,
    ]);

    $delRes = $this->actingAs($admin)->deleteJson("/api/v1/admin/categories/{$category->id}/specs/{$specId}");
    $delRes->assertNoContent();

    expect(SpecDefinition::query()->find($specId))->toBeNull()
        ->and(ProductSpec::query()->find($productSpec->id))->toBeNull(); // Cascaded

    $deleteLog = AdminActivityLog::query()->latest('id')->first();
    expect($deleteLog->action)->toBe('spec_definition.deleted')
        ->and($deleteLog->subject_id)->toBe($specId);
});
