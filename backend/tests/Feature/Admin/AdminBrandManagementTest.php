<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\UserRole;
use App\Models\AdminActivityLog;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('rejects unauthenticated requests to brand management', function (): void {
    $this->getJson('/api/v1/admin/brands')->assertUnauthorized();
    $this->postJson('/api/v1/admin/brands', ['name' => 'Sony'])->assertUnauthorized();
});

it('rejects non-admin customers from managing brands', function (): void {
    $customer = User::factory()->create([
        'role' => UserRole::Customer,
        'is_active' => true,
    ]);

    $this->actingAs($customer)
        ->getJson('/api/v1/admin/brands')
        ->assertForbidden();

    $this->actingAs($customer)
        ->postJson('/api/v1/admin/brands', ['name' => 'Sony'])
        ->assertForbidden();
});

it('rejects deactivated admins from managing brands', function (): void {
    $inactiveAdmin = User::factory()->admin()->inactive()->create();

    $this->actingAs($inactiveAdmin)
        ->getJson('/api/v1/admin/brands')
        ->assertForbidden();
});

it('lists brands with search, sorting, pagination, and product counts', function (): void {
    $admin = User::factory()->admin()->create();

    $apple = Brand::factory()->create(['name' => 'Apple', 'slug' => 'apple']);
    $sony = Brand::factory()->create(['name' => 'Sony', 'slug' => 'sony']);
    $bose = Brand::factory()->create(['name' => 'Bose', 'slug' => 'bose']);

    $category = Category::factory()->create();
    Product::factory()->count(3)->create([
        'brand_id' => $apple->id,
        'category_id' => $category->id,
    ]);
    Product::factory()->count(1)->create([
        'brand_id' => $sony->id,
        'category_id' => $category->id,
    ]);

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/brands');

    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'name',
                    'slug',
                    'logo_path',
                    'logo_url',
                    'products_count',
                    'created_at',
                    'updated_at',
                ],
            ],
            'links',
            'meta',
        ]);

    $data = $response->json('data');
    expect($data)->toHaveCount(3);

    // Default sorting is name asc
    expect($data[0]['name'])->toBe('Apple')
        ->and($data[0]['products_count'])->toBe(3)
        ->and($data[1]['name'])->toBe('Bose')
        ->and($data[1]['products_count'])->toBe(0)
        ->and($data[2]['name'])->toBe('Sony')
        ->and($data[2]['products_count'])->toBe(1);

    // Search filter
    $searchRes = $this->actingAs($admin)->getJson('/api/v1/admin/brands?search=son');
    $searchRes->assertOk();
    expect($searchRes->json('data'))->toHaveCount(1)
        ->and($searchRes->json('data.0.slug'))->toBe('sony');
});

it('creates a new brand, generates slug, and logs audit record', function (): void {
    $admin = User::factory()->admin()->create();

    $payload = [
        'name' => 'Logitech G',
        'logo_path' => 'brands/logitech.png',
    ];

    $response = $this->actingAs($admin)->postJson('/api/v1/admin/brands', $payload);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Logitech G')
        ->assertJsonPath('data.slug', 'logitech-g')
        ->assertJsonPath('data.logo_path', 'brands/logitech.png')
        ->assertJsonPath('data.products_count', 0);

    $brandId = (int) $response->json('data.id');
    $this->assertDatabaseHas('brands', [
        'id' => $brandId,
        'slug' => 'logitech-g',
    ]);

    $audit = AdminActivityLog::query()->where('action', 'brand.created')->latest('id')->first();
    expect($audit)->not->toBeNull()
        ->and($audit->admin_id)->toBe($admin->id)
        ->and($audit->subject_type)->toBe((new Brand)->getMorphClass())
        ->and($audit->subject_id)->toBe($brandId)
        ->and($audit->changes['after']['name'] ?? null)->toBe('Logitech G');
});

it('validates brand creation inputs', function (): void {
    $admin = User::factory()->admin()->create();
    Brand::factory()->create(['name' => 'Asus', 'slug' => 'asus']);

    $response = $this->actingAs($admin)->postJson('/api/v1/admin/brands', [
        'name' => 'A', // too short
        'slug' => 'asus', // duplicate
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'slug'], 'error.details');
});

it('displays a specific brand', function (): void {
    $admin = User::factory()->admin()->create();
    $brand = Brand::factory()->create(['name' => 'Razer', 'slug' => 'razer']);
    $category = Category::factory()->create();
    Product::factory()->count(2)->create([
        'brand_id' => $brand->id,
        'category_id' => $category->id,
    ]);

    $response = $this->actingAs($admin)->getJson("/api/v1/admin/brands/{$brand->id}");

    $response->assertOk()
        ->assertJsonPath('data.id', $brand->id)
        ->assertJsonPath('data.name', 'Razer')
        ->assertJsonPath('data.slug', 'razer')
        ->assertJsonPath('data.products_count', 2);
});

it('updates an existing brand and records before/after diff in audit log', function (): void {
    $admin = User::factory()->admin()->create();
    $brand = Brand::factory()->create(['name' => 'Old Name', 'slug' => 'old-name']);

    $response = $this->actingAs($admin)->putJson("/api/v1/admin/brands/{$brand->id}", [
        'name' => 'New Name',
        'slug' => 'new-name',
        'logo_path' => 'brands/new.png',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.name', 'New Name')
        ->assertJsonPath('data.slug', 'new-name')
        ->assertJsonPath('data.logo_path', 'brands/new.png');

    $this->assertDatabaseHas('brands', [
        'id' => $brand->id,
        'name' => 'New Name',
        'slug' => 'new-name',
    ]);

    $audit = AdminActivityLog::query()->where('action', 'brand.updated')->latest('id')->first();
    expect($audit)->not->toBeNull()
        ->and($audit->admin_id)->toBe($admin->id)
        ->and($audit->subject_id)->toBe($brand->id)
        ->and($audit->changes['before']['name'] ?? null)->toBe('Old Name')
        ->and($audit->changes['after']['name'] ?? null)->toBe('New Name');
});

it('deletes an empty brand and records audit deletion', function (): void {
    $admin = User::factory()->admin()->create();
    $brand = Brand::factory()->create(['name' => 'Temporary', 'slug' => 'temporary']);

    $response = $this->actingAs($admin)->deleteJson("/api/v1/admin/brands/{$brand->id}");

    $response->assertNoContent();
    $this->assertDatabaseMissing('brands', ['id' => $brand->id]);

    $audit = AdminActivityLog::query()->where('action', 'brand.deleted')->latest('id')->first();
    expect($audit)->not->toBeNull()
        ->and($audit->admin_id)->toBe($admin->id)
        ->and($audit->changes['before']['name'] ?? null)->toBe('Temporary');
});

it('prevents deleting a brand that has associated products', function (): void {
    $admin = User::factory()->admin()->create();
    $brand = Brand::factory()->create();
    $category = Category::factory()->create();
    Product::factory()->create([
        'brand_id' => $brand->id,
        'category_id' => $category->id,
    ]);

    $response = $this->actingAs($admin)->deleteJson("/api/v1/admin/brands/{$brand->id}");

    $response->assertUnprocessable()
        ->assertJsonPath('error.code', 'validation_failed');

    $this->assertDatabaseHas('brands', ['id' => $brand->id]);
});
