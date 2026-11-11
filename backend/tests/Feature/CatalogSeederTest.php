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
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('catalog seeder creates six categories, twenty-one brands, sixty products, specs, media, and six-month price history', function (): void {
    Storage::fake('public');
    $this->travelTo(now()->setDate(2026, 11, 11)->startOfDay());

    $this->seed(CatalogSeeder::class);

    $categories = Category::query()->ordered()->get();
    expect($categories)->toHaveCount(6)
        ->and($categories->pluck('slug')->all())->toBe([
            'smartphones',
            'laptops',
            'headphones',
            'monitors',
            'keyboards',
            'smartwatches',
        ])
        ->and($categories->every(static fn (Category $category): bool => $category->is_active && $category->parent_id === null))->toBeTrue();

    foreach ($categories as $category) {
        expect($category->image_path)->toBe("categories/{$category->slug}.svg")
            ->and(Storage::disk('public')->exists((string) $category->image_path))->toBeTrue();
    }

    $brands = Brand::query()->orderBy('slug')->get();
    expect($brands)->toHaveCount(21);

    foreach ($brands as $brand) {
        expect($brand->logo_path)->toBe("brands/{$brand->slug}.svg")
            ->and(Storage::disk('public')->exists((string) $brand->logo_path))->toBeTrue();
    }

    $products = Product::query()
        ->with(['category', 'brand', 'images', 'primaryImage', 'specs.specDefinition', 'priceHistory'])
        ->get();

    expect($products)->toHaveCount(60)
        ->and($products->every(static fn (Product $product): bool => $product->is_published && $product->currency === 'INR'))->toBeTrue();

    foreach ($categories as $category) {
        $categoryProducts = $products->where('category_id', $category->id);
        $categorySpecs = SpecDefinition::query()->where('category_id', $category->id)->ordered()->get();

        expect($categoryProducts)->toHaveCount(10)
            ->and($categorySpecs->count())->toBeGreaterThanOrEqual(8)
            ->and($categorySpecs->where('is_filterable', true)->count())->toBeGreaterThanOrEqual(4)
            ->and($categorySpecs->where('is_comparable', true)->count())->toBeGreaterThanOrEqual(8);
    }

    $availabilities = $products->pluck('availability')->map(static fn (ProductAvailability $state): string => $state->value)->unique()->all();
    expect($availabilities)->toContain(
        ProductAvailability::InStock->value,
        ProductAvailability::LowStock->value,
        ProductAvailability::OutOfStock->value,
    );

    expect($products->where('rating_count', 0)->count())->toBeGreaterThanOrEqual(1)
        ->and($products->where('rating_count', '>', 0)->count())->toBeGreaterThanOrEqual(50);

    foreach ($products as $product) {
        expect($product->images)->toHaveCount(2)
            ->and($product->primaryImage)->not->toBeNull()
            ->and($product->primaryImage?->sort_order)->toBe(0);

        foreach ($product->images as $image) {
            expect(Storage::disk('public')->exists($image->path))->toBeTrue();
            $svg = Storage::disk('public')->get($image->path);
            expect($svg)->toContain('<svg')
                ->and($svg)->not->toContain('<script');
        }

        $expectedSpecCount = SpecDefinition::query()->where('category_id', $product->category_id)->count();
        expect($product->specs)->toHaveCount($expectedSpecCount);

        foreach ($product->specs as $productSpec) {
            $definition = $productSpec->specDefinition;
            expect($definition)->not->toBeNull();

            match ($definition?->data_type) {
                SpecDataType::Number => expect($productSpec->value_number)->not->toBeNull()
                    ->and($productSpec->value_text)->toBeNull()
                    ->and($productSpec->value_bool)->toBeNull(),
                SpecDataType::Boolean => expect($productSpec->value_bool)->not->toBeNull()
                    ->and($productSpec->value_text)->toBeNull()
                    ->and($productSpec->value_number)->toBeNull(),
                SpecDataType::Text => expect($productSpec->value_text)->not->toBeNull()
                    ->and($productSpec->value_number)->toBeNull()
                    ->and($productSpec->value_bool)->toBeNull(),
                null => test()->fail('Missing spec definition relationship.'),
            };
        }

        expect($product->priceHistory)->toHaveCount(13)
            ->and($product->priceHistory->first()?->recorded_at?->toDateString())->toBe('2026-05-15')
            ->and($product->priceHistory->last()?->recorded_at?->toDateString())->toBe('2026-11-11')
            ->and($product->priceHistory->last()?->price)->toBe($product->price);
    }
});

test('database seeder is idempotent across repeated runs and date shifts', function (): void {
    Storage::fake('public');
    $this->travelTo(now()->setDate(2026, 11, 11)->startOfDay());

    $this->seed(DatabaseSeeder::class);

    $firstProductIds = Product::query()->orderBy('slug')->pluck('id', 'slug')->all();
    $firstHistoryIds = PriceHistory::query()->orderBy('id')->pluck('id')->all();

    // Re-running on the same day should preserve row counts and even primary keys.
    $this->seed(DatabaseSeeder::class);

    expect(User::query()->where('email', 'test@example.com')->count())->toBe(1)
        ->and(Category::query()->count())->toBe(6)
        ->and(Brand::query()->count())->toBe(21)
        ->and(Product::query()->count())->toBe(60)
        ->and(ProductImage::query()->count())->toBe(120)
        ->and(ProductSpec::query()->count())->toBe(500)
        ->and(PriceHistory::query()->count())->toBe(780)
        ->and(Product::query()->orderBy('slug')->pluck('id', 'slug')->all())->toBe($firstProductIds)
        ->and(PriceHistory::query()->orderBy('id')->pluck('id')->all())->toBe($firstHistoryIds);

    // Soft-deleting a seeded product and re-running on the next day restores it and keeps exact 780 history rows.
    $sampleProduct = Product::query()->where('slug', 'apple-macbook-air-13-m3')->firstOrFail();
    $sampleProduct->delete();
    expect(Product::query()->where('slug', 'apple-macbook-air-13-m3')->exists())->toBeFalse();

    $this->travel(1)->day();
    $this->seed(DatabaseSeeder::class);

    expect(Product::query()->where('slug', 'apple-macbook-air-13-m3')->exists())->toBeTrue()
        ->and(PriceHistory::query()->count())->toBe(780)
        ->and($sampleProduct->fresh()?->priceHistory()->count())->toBe(13)
        ->and($sampleProduct->fresh()?->priceHistory->last()?->recorded_at?->toDateString())
        ->toBe('2026-11-12');
});

test('seeded active category slugs integrate with account preferences validation', function (): void {
    Storage::fake('public');
    $this->seed(DatabaseSeeder::class);

    $user = User::query()->where('email', 'test@example.com')->firstOrFail();

    $this->actingAs($user)
        ->putJson('/api/v1/account/preferences', [
            'budget_default' => 90000,
            'favourite_categories' => ['laptops', 'monitors'],
            'priorities' => ['performance', 'display'],
        ])
        ->assertOk()
        ->assertJsonPath('data.preferences.favourite_categories', ['laptops', 'monitors']);

    $this->actingAs($user)
        ->putJson('/api/v1/account/preferences', [
            'favourite_categories' => ['unknown-category'],
        ])
        ->assertUnprocessable()
        ->assertJsonPath('error.code', 'validation_failed');
});
