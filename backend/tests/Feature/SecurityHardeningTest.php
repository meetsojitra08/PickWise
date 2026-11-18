<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\ReviewStatus;
use App\Http\Middleware\AddSecurityHeaders;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Comparison;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Services\AssistantSessionResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

it('attaches defense-in-depth security headers to API responses', function (): void {
    $response = $this->getJson('/api/v1/categories');

    $response->assertOk()
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'DENY')
        ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
        ->assertHeader('Permissions-Policy', AddSecurityHeaders::PERMISSIONS_POLICY)
        ->assertHeader('Cross-Origin-Opener-Policy', 'same-origin')
        ->assertHeader('Cross-Origin-Resource-Policy', 'same-origin')
        ->assertHeader('Content-Security-Policy', AddSecurityHeaders::API_CSP);
});

it('attaches security headers on error responses too', function (): void {
    $response = $this->getJson('/api/v1/products/does-not-exist-slug');

    $response->assertNotFound()
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'DENY')
        ->assertHeader('Content-Security-Policy', AddSecurityHeaders::API_CSP);
});

it('does not allow wildcard or untrusted CORS origins on API endpoints', function (): void {
    $allowedOrigins = config('cors.allowed_origins');

    expect($allowedOrigins)->toBeArray()
        ->not->toContain('*')
        ->and(config('cors.supports_credentials'))->toBeTrue();

    $untrustedResponse = $this->withHeader('Origin', 'https://evil.example.com')
        ->getJson('/api/v1/categories');

    $untrustedResponse->assertOk();
    $untrustedHeader = $untrustedResponse->headers->get('Access-Control-Allow-Origin');
    expect($untrustedHeader)->not->toBe('*')
        ->and($untrustedHeader)->not->toBe('https://evil.example.com');

    $trustedOrigin = is_array($allowedOrigins) && isset($allowedOrigins[0]) && is_string($allowedOrigins[0])
        ? $allowedOrigins[0]
        : 'http://localhost:8080';

    $trustedResponse = $this->withHeader('Origin', $trustedOrigin)
        ->getJson('/api/v1/categories');

    $trustedResponse->assertOk()
        ->assertHeader('Access-Control-Allow-Origin', $trustedOrigin)
        ->assertHeader('Access-Control-Allow-Credentials', 'true');
});

it('rejects non-http(s) store_url schemes when creating or updating a product', function (string $badUrl): void {
    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create();
    $brand = Brand::factory()->create();

    $createResponse = $this->actingAs($admin)->postJson('/api/v1/admin/products', [
        'category_id' => $category->id,
        'brand_id' => $brand->id,
        'name' => 'Unsafe Link Phone',
        'slug' => 'unsafe-link-phone',
        'summary' => 'A test product with an unsafe store link.',
        'description' => 'Detailed description for testing URL scheme enforcement.',
        'price' => '499.00',
        'store_url' => $badUrl,
    ]);

    $createResponse->assertUnprocessable()
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonStructure(['error' => ['details' => ['store_url']]]);

    $product = Product::factory()->create([
        'category_id' => $category->id,
        'brand_id' => $brand->id,
    ]);

    $updateResponse = $this->actingAs($admin)->patchJson("/api/v1/admin/products/{$product->id}", [
        'store_url' => $badUrl,
    ]);

    $updateResponse->assertUnprocessable()
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonStructure(['error' => ['details' => ['store_url']]]);
})->with([
    'javascript scheme' => ['javascript:alert(1)'],
    'data uri' => ['data:text/html,<script>alert(1)</script>'],
    'ftp scheme' => ['ftp://files.example.com/product'],
    'file scheme' => ['file:///etc/passwd'],
]);

it('rejects uploaded images with disallowed extensions even when image bytes are valid', function (string $filename): void {
    Storage::fake('public');
    $admin = User::factory()->admin()->create();
    $product = Product::factory()->create();

    $pngBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    $spoofedFile = UploadedFile::fake()->createWithContent($filename, $pngBytes);

    $response = $this->actingAs($admin)->postJson(
        "/api/v1/admin/products/{$product->id}/images",
        [
            'image' => $spoofedFile,
            'alt_text' => 'Attempted extension spoofing image',
        ],
    );

    $response->assertUnprocessable()
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonStructure(['error' => ['details' => ['image']]]);

    expect($product->images()->count())->toBe(0);
})->with([
    'php extension' => ['shell.php'],
    'svg extension' => ['vector.svg'],
    'html extension' => ['page.html'],
    'double extension ending php' => ['photo.png.php'],
]);

it('sanitizes X-Session-Key and rejects spoofed or oversized session headers', function (): void {
    $resolver = new AssistantSessionResolver;

    $validRequest = Request::create('/api/v1/assistant/conversations', 'GET');
    $validRequest->headers->set('X-Session-Key', 'guest-session-12345');
    expect($resolver->resolve($validRequest))->toBe('guest-session-12345');

    foreach ([
        'ip:127.0.0.1',
        'short',
        str_repeat('a', 300),
        "bad\r\nheader",
        'has spaces inside',
    ] as $invalidHeader) {
        $request = Request::create('/api/v1/assistant/conversations', 'GET', server: ['REMOTE_ADDR' => '198.51.100.10']);
        $request->headers->set('X-Session-Key', $invalidHeader);

        expect($resolver->resolve($request))->toBe('ip:198.51.100.10');
    }
});

it('enforces the access-admin gate on the admin dashboard endpoint', function (): void {
    $customer = User::factory()->create();
    $inactiveAdmin = User::factory()->admin()->inactive()->create();
    $activeAdmin = User::factory()->admin()->create();

    expect(Gate::forUser($customer)->allows('access-admin'))->toBeFalse()
        ->and(Gate::forUser($inactiveAdmin)->allows('access-admin'))->toBeFalse()
        ->and(Gate::forUser($activeAdmin)->allows('access-admin'))->toBeTrue();

    $this->actingAs($customer)
        ->getJson('/api/v1/admin/dashboard')
        ->assertForbidden();

    $this->actingAs($inactiveAdmin)
        ->getJson('/api/v1/admin/dashboard')
        ->assertForbidden();
});

it('escapes SQL LIKE wildcards literally in admin search queries', function (): void {
    $admin = User::factory()->admin()->create(['name' => 'Root Admin', 'email' => 'root@example.com']);
    User::factory()->create(['name' => 'Regular Customer', 'email' => 'regular@example.com']);
    User::factory()->create(['name' => '100% Verified Buyer', 'email' => 'hundred@example.com']);

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/users?search=%25');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.email', 'hundred@example.com');

    Brand::factory()->create(['name' => 'Apex Audio', 'slug' => 'apex-audio']);
    Brand::factory()->create(['name' => 'Under_Score Labs', 'slug' => 'underscore-labs']);

    $brandResponse = $this->actingAs($admin)->getJson('/api/v1/admin/brands?search=_');

    $brandResponse->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', 'underscore-labs');
});

it('never leaks reviewer email or hidden model attributes on public endpoints', function (): void {
    $author = User::factory()->create([
        'name' => 'Alex Rivera',
        'email' => 'alex.private@example.com',
    ]);
    $product = Product::factory()->create(['is_published' => true]);
    $review = Review::factory()->create([
        'product_id' => $product->id,
        'user_id' => $author->id,
        'status' => ReviewStatus::Approved,
    ]);

    $response = $this->getJson("/api/v1/products/{$product->slug}/reviews");

    $response->assertOk();
    $payload = $response->json();
    $serialized = json_encode($payload, JSON_THROW_ON_ERROR);

    expect($serialized)->not->toContain('alex.private@example.com')
        ->and($serialized)->not->toContain($author->password)
        ->and($review->isFillable('status'))->toBeFalse()
        ->and($review->isFillable('moderated_by'))->toBeFalse()
        ->and($author->isFillable('role'))->toBeFalse()
        ->and($author->isFillable('is_active'))->toBeFalse()
        ->and((new Comparison)->getHidden())->toContain('share_token')
        ->and((new Product)->getHidden())->toContain('search_vector');
});
