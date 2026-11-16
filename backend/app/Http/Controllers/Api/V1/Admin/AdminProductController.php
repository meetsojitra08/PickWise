<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\SpecDataType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BulkProductStatusRequest;
use App\Http\Requests\Admin\IndexProductsRequest;
use App\Http\Requests\Admin\StoreProductRequest;
use App\Http\Requests\Admin\UpdateProductRequest;
use App\Http\Resources\Admin\AdminProductResource;
use App\Http\Responses\ApiResponse;
use App\Jobs\GenerateReviewSummary;
use App\Models\PriceHistory;
use App\Models\Product;
use App\Models\ProductSpec;
use App\Models\SpecDefinition;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\ValueScoreCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

final class AdminProductController extends Controller
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly ValueScoreCalculator $valueScoreCalculator,
    ) {}

    /**
     * List products with search, category, brand, and published filters.
     */
    public function index(IndexProductsRequest $request): AnonymousResourceCollection
    {
        $query = Product::query()->with([
            'category:id,name,slug',
            'brand:id,name,slug',
            'primaryImage',
        ]);

        if ($request->input('trashed') === 'only') {
            $query->onlyTrashed();
        } elseif ($request->input('trashed') === 'with') {
            $query->withTrashed();
        }

        if ($request->filled('search')) {
            $search = (string) $request->input('search');
            $query->where(static function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhereHas('brand', static function ($bq) use ($search): void {
                        $bq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', (int) $request->input('category_id'));
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', (int) $request->input('brand_id'));
        }

        if ($request->has('is_published') && $request->input('is_published') !== null) {
            $query->where('is_published', $request->boolean('is_published'));
        }

        if ($request->filled('availability')) {
            $query->where('availability', (string) $request->input('availability'));
        }

        $sort = (string) $request->input('sort', '-created_at');
        match ($sort) {
            'created_at' => $query->orderBy('created_at')->orderBy('id'),
            'name' => $query->orderBy('name')->orderBy('id'),
            '-name' => $query->orderByDesc('name')->orderByDesc('id'),
            'price' => $query->orderBy('price')->orderBy('id'),
            '-price' => $query->orderByDesc('price')->orderByDesc('id'),
            'value_score' => $query->orderBy('value_score')->orderBy('id'),
            '-value_score' => $query->orderByDesc('value_score')->orderByDesc('id'),
            'rating_avg' => $query->orderBy('rating_avg')->orderBy('id'),
            '-rating_avg' => $query->orderByDesc('rating_avg')->orderByDesc('id'),
            default => $query->orderByDesc('created_at')->orderByDesc('id'),
        };

        $perPage = (int) $request->input('per_page', 25);
        $products = $query->paginate($perPage);

        return AdminProductResource::collection($products);
    }

    /**
     * Create a new product, initial price history, specs, and recalculate Value Score.
     */
    public function store(StoreProductRequest $request): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();

        /** @var Product $product */
        $product = DB::transaction(function () use ($request, $admin): Product {
            $specs = $request->input('specs');
            /** @var array<string, mixed> $attributes */
            $attributes = $request->safe()->except(['specs']);

            /** @var Product $newProduct */
            $newProduct = Product::query()->create($attributes);

            PriceHistory::query()->create([
                'product_id' => $newProduct->id,
                'price' => $newProduct->price,
                'recorded_at' => now()->toDateString(),
            ]);

            if (is_array($specs)) {
                $this->syncProductSpecs($newProduct, $specs);
            }

            if ($newProduct->is_published) {
                $this->valueScoreCalculator->recalculateCategory($newProduct->category_id);
            }

            $newProduct->refresh()->load([
                'category:id,name,slug',
                'brand:id,name,slug',
                'primaryImage',
                'images',
                'specs.specDefinition',
                'priceHistory',
            ]);

            $this->auditLogger->logCreated($admin, $newProduct);

            return $newProduct;
        });

        return (new AdminProductResource($product))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Display a specific product with full administrative relations.
     */
    public function show(Product $product): AdminProductResource
    {
        Gate::authorize('view', $product);

        $product->load([
            'category:id,name,slug',
            'brand:id,name,slug',
            'primaryImage',
            'images',
            'specs.specDefinition',
            'priceHistory',
        ]);

        return new AdminProductResource($product);
    }

    /**
     * Update an existing product, record price history if price changed, sync specs, and recalculate Value Score.
     */
    public function update(UpdateProductRequest $request, Product $product): AdminProductResource
    {
        /** @var User $admin */
        $admin = $request->user();

        /** @var Product $updatedProduct */
        $updatedProduct = DB::transaction(function () use ($request, $product, $admin): Product {
            $before = $product->getAttributes();
            $oldCategoryId = $product->category_id;
            $oldPrice = (string) $product->price;

            $specsProvided = $request->has('specs');
            $specs = $request->input('specs');
            /** @var array<string, mixed> $attributes */
            $attributes = $request->safe()->except(['specs']);

            if ($attributes !== []) {
                $product->update($attributes);
            }

            $priceChanged = $product->wasChanged('price')
                || ($request->has('price') && bccomp($oldPrice, (string) $product->price, 2) !== 0);

            if ($priceChanged) {
                PriceHistory::query()->create([
                    'product_id' => $product->id,
                    'price' => $product->price,
                    'recorded_at' => now()->toDateString(),
                ]);
            }

            $specsChanged = false;
            if ($specsProvided && is_array($specs)) {
                $this->syncProductSpecs($product, $specs);
                $specsChanged = true;
            }

            $categoryChanged = $oldCategoryId !== $product->category_id;
            $publishedChanged = $product->wasChanged('is_published');

            if ($priceChanged || $specsChanged || $categoryChanged || $publishedChanged) {
                $this->valueScoreCalculator->recalculateCategory($product->category_id);
                if ($categoryChanged) {
                    $this->valueScoreCalculator->recalculateCategory($oldCategoryId);
                }
            }

            $product->refresh()->load([
                'category:id,name,slug',
                'brand:id,name,slug',
                'primaryImage',
                'images',
                'specs.specDefinition',
                'priceHistory',
            ]);

            $this->auditLogger->logUpdated($admin, $product, $before, $product->getAttributes());

            return $product;
        });

        return new AdminProductResource($updatedProduct);
    }

    /**
     * Soft delete a product, recalculate Value Score, and log audit trail.
     */
    public function destroy(Product $product, Request $request): Response
    {
        Gate::authorize('delete', $product);

        /** @var User $admin */
        $admin = $request->user();
        $before = $product->getAttributes();
        $categoryId = $product->category_id;

        $product->delete();

        $this->valueScoreCalculator->recalculateCategory($categoryId);
        $this->auditLogger->logDeleted($admin, $product, $before);

        return ApiResponse::noContent();
    }

    /**
     * Bulk update publishing status for multiple products.
     */
    public function bulkStatus(BulkProductStatusRequest $request): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();

        /** @var list<int> $productIds */
        $productIds = $request->input('product_ids');
        $isPublished = $request->boolean('is_published');

        $affectedCategories = DB::transaction(function () use ($productIds, $isPublished, $admin): array {
            $products = Product::query()->whereIn('id', $productIds)->get();

            Product::query()
                ->whereIn('id', $productIds)
                ->update(['is_published' => $isPublished, 'updated_at' => now()]);

            $categoryIds = $products->pluck('category_id')->unique()->all();

            foreach ($categoryIds as $categoryId) {
                $this->valueScoreCalculator->recalculateCategory((int) $categoryId);
            }

            $this->auditLogger->record(
                admin: $admin,
                action: 'product.bulk_status_updated',
                changes: [
                    'product_ids' => $productIds,
                    'is_published' => $isPublished,
                ],
            );

            return $categoryIds;
        });

        return ApiResponse::success([
            'updated_count' => count($productIds),
            'is_published' => $isPublished,
            'affected_categories' => count($affectedCategories),
        ]);
    }

    /**
     * Trigger review summary regeneration for a product.
     */
    public function regenerateSummary(Product $product, Request $request): JsonResponse
    {
        Gate::authorize('update', $product);

        /** @var User $admin */
        $admin = $request->user();

        GenerateReviewSummary::dispatch($product->id);

        $this->auditLogger->record(
            admin: $admin,
            action: 'product.summary_regenerated',
            subject: $product,
            changes: [
                'product_id' => $product->id,
                'name' => $product->name,
            ],
        );

        return ApiResponse::success([
            'product_id' => $product->id,
            'queued' => true,
            'message' => 'Review summary regeneration queued.',
        ]);
    }

    /**
     * Synchronize specification values on a product.
     *
     * @param  array<int, array{spec_definition_id: int, value: mixed}>  $specs
     */
    private function syncProductSpecs(Product $product, array $specs): void
    {
        if ($specs === []) {
            $product->specs()->delete();

            return;
        }

        $definitionIds = array_column($specs, 'spec_definition_id');
        $definitions = SpecDefinition::query()
            ->whereIn('id', $definitionIds)
            ->get()
            ->keyBy('id');

        $keptIds = [];

        foreach ($specs as $item) {
            $defId = (int) $item['spec_definition_id'];
            $definition = $definitions->get($defId);

            if (! $definition instanceof SpecDefinition) {
                continue;
            }

            $raw = $item['value'] ?? null;
            $valueNumber = null;
            $valueText = null;
            $valueBool = null;

            match ($definition->data_type) {
                SpecDataType::Number => $valueNumber = is_numeric($raw) ? (float) $raw : null,
                SpecDataType::Boolean => $valueBool = is_bool($raw)
                    ? $raw
                    : in_array($raw, [1, '1', 'true', true], true),
                SpecDataType::Text => $valueText = $raw !== null ? (string) $raw : null,
            };

            /** @var ProductSpec $specRecord */
            $specRecord = ProductSpec::query()->updateOrCreate(
                [
                    'product_id' => $product->id,
                    'spec_definition_id' => $definition->id,
                ],
                [
                    'value_number' => $valueNumber,
                    'value_text' => $valueText,
                    'value_bool' => $valueBool,
                ],
            );

            $keptIds[] = $specRecord->id;
        }

        $product->specs()->whereNotIn('id', $keptIds)->delete();
    }
}
