<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\UserRole;
use App\Models\AdminActivityLog;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

/**
 * Generate a valid test image file without requiring the GD extension.
 */
function createFakeImage(string $filename = 'test.png', int $kilobytes = 10): UploadedFile
{
    // 1x1 transparent PNG header + body
    $pngBase = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    $padLength = max(0, ($kilobytes * 1024) - strlen($pngBase));
    $content = $pngBase.str_repeat(' ', $padLength);

    return UploadedFile::fake()->createWithContent($filename, $content);
}

it('rejects unauthenticated requests to product image management', function (): void {
    $product = Product::factory()->create();

    $this->getJson("/api/v1/admin/products/{$product->id}/images")->assertUnauthorized();
    $this->postJson("/api/v1/admin/products/{$product->id}/images", [])->assertUnauthorized();
    $this->patchJson("/api/v1/admin/products/{$product->id}/images/reorder", [])->assertUnauthorized();
    $this->patchJson("/api/v1/admin/products/{$product->id}/images/999", [])->assertUnauthorized();
    $this->deleteJson("/api/v1/admin/products/{$product->id}/images/999")->assertUnauthorized();
});

it('rejects non-admin customers from managing product images', function (): void {
    $customer = User::factory()->create([
        'role' => UserRole::Customer,
        'is_active' => true,
    ]);
    $product = Product::factory()->create();

    $this->actingAs($customer)
        ->getJson("/api/v1/admin/products/{$product->id}/images")
        ->assertForbidden();

    $this->actingAs($customer)
        ->postJson("/api/v1/admin/products/{$product->id}/images", [])
        ->assertForbidden();

    $this->actingAs($customer)
        ->patchJson("/api/v1/admin/products/{$product->id}/images/reorder", ['image_ids' => [1]])
        ->assertForbidden();
});

it('rejects deactivated admins from managing product images', function (): void {
    $inactiveAdmin = User::factory()->admin()->inactive()->create();
    $product = Product::factory()->create();

    $this->actingAs($inactiveAdmin)
        ->getJson("/api/v1/admin/products/{$product->id}/images")
        ->assertForbidden();
});

it('lists all images for a product in administrative order', function (): void {
    $admin = User::factory()->admin()->create();
    $product = Product::factory()->create();

    $img1 = ProductImage::factory()->create([
        'product_id' => $product->id,
        'alt_text' => 'Front view',
        'sort_order' => 1,
        'is_primary' => false,
    ]);
    $img2 = ProductImage::factory()->create([
        'product_id' => $product->id,
        'alt_text' => 'Side view',
        'sort_order' => 0,
        'is_primary' => true,
    ]);

    $response = $this->actingAs($admin)
        ->getJson("/api/v1/admin/products/{$product->id}/images");

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.id', $img2->id)
        ->assertJsonPath('data.0.is_primary', true)
        ->assertJsonPath('data.1.id', $img1->id)
        ->assertJsonPath('data.1.is_primary', false);
});

it('uploads an image, stores on public disk, designates as primary if first image, and logs audit', function (): void {
    Storage::fake('public');
    $admin = User::factory()->admin()->create();
    $product = Product::factory()->create();

    $file = createFakeImage('headphone.png', 50);

    $response = $this->actingAs($admin)->postJson(
        "/api/v1/admin/products/{$product->id}/images",
        [
            'image' => $file,
            'alt_text' => 'Front view of noise-cancelling headphones',
        ],
    );

    $response->assertCreated()
        ->assertJsonStructure([
            'data' => [
                'id',
                'url',
                'alt_text',
                'sort_order',
                'is_primary',
            ],
        ])
        ->assertJsonPath('data.alt_text', 'Front view of noise-cancelling headphones')
        ->assertJsonPath('data.sort_order', 0)
        ->assertJsonPath('data.is_primary', true);

    $imageId = (int) $response->json('data.id');
    $image = ProductImage::query()->findOrFail($imageId);

    expect($image->is_primary)->toBeTrue()
        ->and($image->sort_order)->toBe(0);

    // Verify stored file on disk
    Storage::disk('public')->assertExists($image->path);

    // Verify audit log
    $auditLog = AdminActivityLog::query()
        ->where('action', 'product_image.created')
        ->where('subject_type', $image->getMorphClass())
        ->where('subject_id', $image->id)
        ->first();

    expect($auditLog)->not->toBeNull()
        ->and($auditLog->admin_id)->toBe($admin->id)
        ->and($auditLog->changes['after']['alt_text'])->toBe('Front view of noise-cancelling headphones');
});

it('demotes existing primary when a new primary image is uploaded', function (): void {
    Storage::fake('public');
    $admin = User::factory()->admin()->create();
    $product = Product::factory()->create();

    $existingImg = ProductImage::factory()->primary()->create([
        'product_id' => $product->id,
        'alt_text' => 'Existing hero',
    ]);

    $file = createFakeImage('headphone-new.png', 40);

    $response = $this->actingAs($admin)->postJson(
        "/api/v1/admin/products/{$product->id}/images",
        [
            'image' => $file,
            'alt_text' => 'New flagship angle',
            'is_primary' => true,
        ],
    );

    $response->assertCreated()
        ->assertJsonPath('data.is_primary', true);

    expect($existingImg->refresh()->is_primary)->toBeFalse();
});

it('validates uploaded image file type, size, and required alt text', function (): void {
    Storage::fake('public');
    $admin = User::factory()->admin()->create();
    $product = Product::factory()->create();

    // 1. Missing image and alt text
    $response = $this->actingAs($admin)
        ->postJson("/api/v1/admin/products/{$product->id}/images", []);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['image', 'alt_text'], 'error.details');

    // 2. Invalid MIME type (PDF)
    $pdf = UploadedFile::fake()->create('manual.pdf', 200, 'application/pdf');
    $responseInvalidType = $this->actingAs($admin)
        ->postJson("/api/v1/admin/products/{$product->id}/images", [
            'image' => $pdf,
            'alt_text' => 'Product manual',
        ]);

    $responseInvalidType->assertUnprocessable()
        ->assertJsonValidationErrors(['image'], 'error.details');

    // 3. Oversized image (> 5 MB, e.g. 6000 KB)
    $oversized = createFakeImage('huge.png', 6000);
    $responseOversized = $this->actingAs($admin)
        ->postJson("/api/v1/admin/products/{$product->id}/images", [
            'image' => $oversized,
            'alt_text' => 'Gigantic file',
        ]);

    $responseOversized->assertUnprocessable()
        ->assertJsonValidationErrors(['image'], 'error.details');
});

it('reorders gallery images and updates primary status with audit log', function (): void {
    $admin = User::factory()->admin()->create();
    $product = Product::factory()->create();

    $img1 = ProductImage::factory()->create(['product_id' => $product->id, 'sort_order' => 0, 'is_primary' => true]);
    $img2 = ProductImage::factory()->create(['product_id' => $product->id, 'sort_order' => 1, 'is_primary' => false]);
    $img3 = ProductImage::factory()->create(['product_id' => $product->id, 'sort_order' => 2, 'is_primary' => false]);

    $response = $this->actingAs($admin)->patchJson(
        "/api/v1/admin/products/{$product->id}/images/reorder",
        [
            'image_ids' => [$img3->id, $img1->id, $img2->id],
            'primary_id' => $img3->id,
        ],
    );

    $response->assertOk()
        ->assertJsonCount(3, 'data');

    expect($img3->refresh()->sort_order)->toBe(0)
        ->and($img3->is_primary)->toBeTrue()
        ->and($img1->refresh()->sort_order)->toBe(1)
        ->and($img1->is_primary)->toBeFalse()
        ->and($img2->refresh()->sort_order)->toBe(2)
        ->and($img2->is_primary)->toBeFalse();

    $auditLog = AdminActivityLog::query()
        ->where('action', 'product_image.reordered')
        ->where('subject_type', $product->getMorphClass())
        ->where('subject_id', $product->id)
        ->first();

    expect($auditLog)->not->toBeNull()
        ->and($auditLog->changes['image_ids'])->toBe([$img3->id, $img1->id, $img2->id])
        ->and($auditLog->changes['primary_id'])->toBe($img3->id);
});

it('rejects reordering when image IDs do not belong to the product', function (): void {
    $admin = User::factory()->admin()->create();
    $productA = Product::factory()->create();
    $productB = Product::factory()->create();

    $imgA = ProductImage::factory()->create(['product_id' => $productA->id]);
    $imgB = ProductImage::factory()->create(['product_id' => $productB->id]);

    $response = $this->actingAs($admin)->patchJson(
        "/api/v1/admin/products/{$productA->id}/images/reorder",
        [
            'image_ids' => [$imgA->id, $imgB->id],
        ],
    );

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['image_ids'], 'error.details');
});

it('updates product image alt text and primary status', function (): void {
    $admin = User::factory()->admin()->create();
    $product = Product::factory()->create();

    $img1 = ProductImage::factory()->primary()->create([
        'product_id' => $product->id,
        'alt_text' => 'Old description',
    ]);
    $img2 = ProductImage::factory()->create([
        'product_id' => $product->id,
        'alt_text' => 'Second image',
        'is_primary' => false,
    ]);

    $response = $this->actingAs($admin)->patchJson(
        "/api/v1/admin/products/{$product->id}/images/{$img2->id}",
        [
            'alt_text' => 'Updated high-resolution view',
            'is_primary' => true,
        ],
    );

    $response->assertOk()
        ->assertJsonPath('data.id', $img2->id)
        ->assertJsonPath('data.alt_text', 'Updated high-resolution view')
        ->assertJsonPath('data.is_primary', true);

    expect($img2->refresh()->alt_text)->toBe('Updated high-resolution view')
        ->and($img2->is_primary)->toBeTrue()
        ->and($img1->refresh()->is_primary)->toBeFalse();

    $auditLog = AdminActivityLog::query()
        ->where('action', 'product_image.updated')
        ->where('subject_type', $img2->getMorphClass())
        ->where('subject_id', $img2->id)
        ->first();

    expect($auditLog)->not->toBeNull()
        ->and($auditLog->changes['after']['alt_text'])->toBe('Updated high-resolution view');
});

it('deletes an image, deletes its storage file, promotes next image to primary, and records audit', function (): void {
    Storage::fake('public');
    $admin = User::factory()->admin()->create();
    $product = Product::factory()->create();

    $fakeFile = createFakeImage('to-delete.png', 20);
    $storedPath = $fakeFile->store('products', 'public');

    $primaryImg = ProductImage::factory()->create([
        'product_id' => $product->id,
        'path' => $storedPath,
        'is_primary' => true,
        'sort_order' => 0,
    ]);
    $secondaryImg = ProductImage::factory()->create([
        'product_id' => $product->id,
        'is_primary' => false,
        'sort_order' => 1,
    ]);

    Storage::disk('public')->assertExists($storedPath);

    $response = $this->actingAs($admin)->deleteJson(
        "/api/v1/admin/products/{$product->id}/images/{$primaryImg->id}",
    );

    $response->assertNoContent();

    expect(ProductImage::query()->find($primaryImg->id))->toBeNull()
        ->and($secondaryImg->refresh()->is_primary)->toBeTrue();

    Storage::disk('public')->assertMissing($storedPath);

    $auditLog = AdminActivityLog::query()
        ->where('action', 'product_image.deleted')
        ->where('subject_type', $primaryImg->getMorphClass())
        ->where('subject_id', $primaryImg->id)
        ->first();

    expect($auditLog)->not->toBeNull()
        ->and($auditLog->changes['before']['id'])->toBe($primaryImg->id);
});

it('rejects image operations across mismatched product scopes with 404', function (): void {
    $admin = User::factory()->admin()->create();
    $productA = Product::factory()->create();
    $productB = Product::factory()->create();

    $imgB = ProductImage::factory()->create(['product_id' => $productB->id]);

    $this->actingAs($admin)
        ->patchJson("/api/v1/admin/products/{$productA->id}/images/{$imgB->id}", ['alt_text' => 'New'])
        ->assertNotFound();

    $this->actingAs($admin)
        ->deleteJson("/api/v1/admin/products/{$productA->id}/images/{$imgB->id}")
        ->assertNotFound();
});

it('immediately displays uploaded and primary images on public catalog and detail endpoints', function (): void {
    Storage::fake('public');
    $admin = User::factory()->admin()->create();

    $category = Category::factory()->create(['is_active' => true]);
    $brand = Brand::factory()->create();
    $product = Product::factory()->create([
        'category_id' => $category->id,
        'brand_id' => $brand->id,
        'is_published' => true,
        'slug' => 'showcase-flagship-laptop',
    ]);

    $file = createFakeImage('flagship.png', 30);

    $this->actingAs($admin)->postJson(
        "/api/v1/admin/products/{$product->id}/images",
        [
            'image' => $file,
            'alt_text' => 'Showcase flagship laptop angle',
        ],
    )->assertCreated();

    // Check public product detail
    $detailResponse = $this->getJson("/api/v1/products/{$product->slug}");
    $detailResponse->assertOk()
        ->assertJsonPath('data.primary_image.alt_text', 'Showcase flagship laptop angle')
        ->assertJsonCount(1, 'data.images');
});
