<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\SpecDataType;
use App\Models\Brand;
use App\Models\Category;
use App\Models\PriceHistory;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductSpec;
use App\Models\SpecDefinition;
use App\Services\ValueScoreCalculator;
use Carbon\CarbonImmutable;
use Database\Seeders\Catalog\CatalogDefinitions;
use Database\Seeders\Catalog\CatalogMediaGenerator;
use Database\Seeders\Catalog\Categories\HeadphonesCatalogData;
use Database\Seeders\Catalog\Categories\KeyboardsCatalogData;
use Database\Seeders\Catalog\Categories\LaptopsCatalogData;
use Database\Seeders\Catalog\Categories\MonitorsCatalogData;
use Database\Seeders\Catalog\Categories\SmartphonesCatalogData;
use Database\Seeders\Catalog\Categories\SmartwatchesCatalogData;
use Database\Seeders\Catalog\CategoryCatalogProvider;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

/**
 * Deterministic, idempotent showcase catalog seeder (6 categories, 21 brands, 60 products, specs, media, history).
 *
 * @phpstan-import-type ProductSeed from CategoryCatalogProvider
 * @phpstan-import-type SpecDefinitionSeed from CategoryCatalogProvider
 */
class CatalogSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the showcase catalog.
     */
    public function run(): void
    {
        $anchorDate = CarbonImmutable::instance(now()->startOfDay());
        $media = new CatalogMediaGenerator(Storage::disk('public'));
        $providers = $this->providers();

        DB::transaction(function () use ($anchorDate, $media, $providers): void {
            $categoriesBySlug = $this->seedCategories($media);
            $brandsBySlug = $this->seedBrands($media);

            foreach ($providers as $provider) {
                $category = $categoriesBySlug[$provider->categorySlug()] ?? throw new InvalidArgumentException(
                    "Unknown seeded category [{$provider->categorySlug()}].",
                );

                $specDefsByKey = $this->seedSpecDefinitions($category, $provider->specDefinitions());

                foreach ($provider->products() as $productData) {
                    $brand = $brandsBySlug[$productData['brand_slug']] ?? throw new InvalidArgumentException(
                        "Unknown seeded brand [{$productData['brand_slug']}].",
                    );

                    $this->seedProduct(
                        category: $category,
                        brand: $brand,
                        specDefsByKey: $specDefsByKey,
                        productData: $productData,
                        media: $media,
                        anchorDate: $anchorDate,
                    );
                }

                app(ValueScoreCalculator::class)->recalculateCategory($category->id);
            }
        });
    }

    /**
     * @return list<CategoryCatalogProvider>
     */
    private function providers(): array
    {
        return [
            new SmartphonesCatalogData,
            new LaptopsCatalogData,
            new HeadphonesCatalogData,
            new MonitorsCatalogData,
            new KeyboardsCatalogData,
            new SmartwatchesCatalogData,
        ];
    }

    /**
     * @return array<string, Category>
     */
    private function seedCategories(CatalogMediaGenerator $media): array
    {
        $categoriesBySlug = [];

        foreach (CatalogDefinitions::categories() as $categoryData) {
            $imagePath = $media->putCategoryImage($categoryData['slug'], $categoryData['name']);

            $categoriesBySlug[$categoryData['slug']] = Category::query()->updateOrCreate(
                ['slug' => $categoryData['slug']],
                [
                    'parent_id' => null,
                    'name' => $categoryData['name'],
                    'description' => $categoryData['description'],
                    'image_path' => $imagePath,
                    'sort_order' => $categoryData['sort_order'],
                    'is_active' => true,
                ],
            );
        }

        return $categoriesBySlug;
    }

    /**
     * @return array<string, Brand>
     */
    private function seedBrands(CatalogMediaGenerator $media): array
    {
        $brandsBySlug = [];

        foreach (CatalogDefinitions::brands() as $brandData) {
            $logoPath = $media->putBrandLogo($brandData['slug'], $brandData['name']);

            $brandsBySlug[$brandData['slug']] = Brand::query()->updateOrCreate(
                ['slug' => $brandData['slug']],
                [
                    'name' => $brandData['name'],
                    'logo_path' => $logoPath,
                ],
            );
        }

        return $brandsBySlug;
    }

    /**
     * @param  list<SpecDefinitionSeed>  $definitions
     * @return array<string, SpecDefinition>
     */
    private function seedSpecDefinitions(Category $category, array $definitions): array
    {
        $specDefsByKey = [];

        foreach ($definitions as $definition) {
            $specDefsByKey[$definition['key']] = SpecDefinition::query()->updateOrCreate(
                [
                    'category_id' => $category->id,
                    'key' => $definition['key'],
                ],
                [
                    'label' => $definition['label'],
                    'unit' => $definition['unit'],
                    'data_type' => $definition['data_type']->value,
                    'is_filterable' => $definition['is_filterable'],
                    'is_comparable' => $definition['is_comparable'],
                    'higher_is_better' => $definition['higher_is_better'],
                    'sort_order' => $definition['sort_order'],
                ],
            );
        }

        return $specDefsByKey;
    }

    /**
     * @param  array<string, SpecDefinition>  $specDefsByKey
     * @param  ProductSeed  $productData
     */
    private function seedProduct(
        Category $category,
        Brand $brand,
        array $specDefsByKey,
        array $productData,
        CatalogMediaGenerator $media,
        CarbonImmutable $anchorDate,
    ): void {
        $product = Product::withTrashed()->updateOrCreate(
            ['slug' => $productData['slug']],
            [
                'category_id' => $category->id,
                'brand_id' => $brand->id,
                'name' => $productData['name'],
                'summary' => $productData['summary'],
                'description' => $productData['description'],
                'price' => sprintf('%d.00', $productData['price_rupees']),
                'currency' => 'INR',
                'availability' => $productData['availability']->value,
                'store_url' => "https://store.example.com/products/{$productData['slug']}",
                'is_published' => true,
            ],
        );

        if ($product->trashed()) {
            $product->restore();
        }

        $product->rating_avg = $productData['rating_avg'];
        $product->rating_count = $productData['rating_count'];

        if ($product->isDirty(['rating_avg', 'rating_count'])) {
            $product->save();
        }

        $this->syncImages($product, $category->slug, $brand->name, $media);
        $this->syncSpecs($product, $specDefsByKey, $productData['specs']);
        $this->syncPriceHistory($product, $productData['price_rupees'], $productData['price_profile'], $anchorDate);
    }

    private function syncImages(
        Product $product,
        string $categorySlug,
        string $brandName,
        CatalogMediaGenerator $media,
    ): void {
        $gallery = $media->putProductGallery(
            categorySlug: $categorySlug,
            productSlug: $product->slug,
            productName: $product->name,
            brandName: $brandName,
        );

        $expectedPaths = [];

        foreach ($gallery as $image) {
            $expectedPaths[] = $image['path'];

            ProductImage::query()->updateOrCreate(
                [
                    'product_id' => $product->id,
                    'path' => $image['path'],
                ],
                [
                    'alt_text' => $image['alt_text'],
                    'sort_order' => $image['sort_order'],
                    'is_primary' => $image['is_primary'],
                ],
            );
        }

        ProductImage::query()
            ->where('product_id', $product->id)
            ->whereNotIn('path', $expectedPaths)
            ->delete();
    }

    /**
     * @param  array<string, SpecDefinition>  $specDefsByKey
     * @param  array<string, float|int|bool|string>  $specValues
     */
    private function syncSpecs(
        Product $product,
        array $specDefsByKey,
        array $specValues,
    ): void {
        foreach ($specDefsByKey as $key => $specDef) {
            if (! array_key_exists($key, $specValues)) {
                throw new InvalidArgumentException(
                    "Missing spec [{$key}] for seeded product [{$product->slug}].",
                );
            }
        }

        foreach ($specValues as $key => $rawValue) {
            $specDef = $specDefsByKey[$key] ?? throw new InvalidArgumentException(
                "Unknown spec key [{$key}] on seeded product [{$product->slug}].",
            );

            $typedColumns = match ($specDef->data_type) {
                SpecDataType::Number => is_int($rawValue) || is_float($rawValue)
                    ? [
                        'value_text' => null,
                        'value_number' => (float) $rawValue,
                        'value_bool' => null,
                    ]
                    : throw new InvalidArgumentException(
                        "Spec [{$key}] on seeded product [{$product->slug}] must be numeric.",
                    ),
                SpecDataType::Boolean => is_bool($rawValue)
                    ? [
                        'value_text' => null,
                        'value_number' => null,
                        'value_bool' => $rawValue,
                    ]
                    : throw new InvalidArgumentException(
                        "Spec [{$key}] on seeded product [{$product->slug}] must be boolean.",
                    ),
                SpecDataType::Text => is_string($rawValue)
                    ? [
                        'value_text' => $rawValue,
                        'value_number' => null,
                        'value_bool' => null,
                    ]
                    : throw new InvalidArgumentException(
                        "Spec [{$key}] on seeded product [{$product->slug}] must be a string.",
                    ),
            };

            ProductSpec::query()->updateOrCreate(
                [
                    'product_id' => $product->id,
                    'spec_definition_id' => $specDef->id,
                ],
                $typedColumns,
            );
        }
    }

    private function syncPriceHistory(
        Product $product,
        int $priceRupees,
        string $priceProfile,
        CarbonImmutable $anchorDate,
    ): void {
        $expectedSeries = CatalogDefinitions::priceHistoryFor(
            currentRupees: $priceRupees,
            profile: $priceProfile,
            anchorDate: $anchorDate,
        );

        $existingSeries = PriceHistory::query()
            ->where('product_id', $product->id)
            ->orderBy('recorded_at')
            ->orderBy('id')
            ->get(['price', 'recorded_at'])
            ->map(static fn (PriceHistory $row): array => [
                'price' => (string) $row->price,
                'recorded_at' => $row->recorded_at->toDateString(),
            ])
            ->values()
            ->all();

        if ($existingSeries === $expectedSeries) {
            return;
        }

        PriceHistory::query()
            ->where('product_id', $product->id)
            ->delete();

        $timestamp = now();
        $rows = array_map(
            static fn (array $point): array => [
                'product_id' => $product->id,
                'price' => $point['price'],
                'recorded_at' => $point['recorded_at'],
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            $expectedSeries,
        );

        PriceHistory::query()->insert($rows);
    }
}
