<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReorderProductImagesRequest;
use App\Http\Requests\Admin\UpdateProductImageRequest;
use App\Http\Requests\Admin\UploadProductImageRequest;
use App\Http\Resources\ProductImageResource;
use App\Http\Responses\ApiResponse;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Throwable;

final class AdminProductImageController extends Controller
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
    ) {}

    /**
     * List all images for a product.
     */
    public function index(Product $product): AnonymousResourceCollection
    {
        Gate::authorize('view', $product);

        return ProductImageResource::collection(
            $product->images()->get()
        );
    }

    /**
     * Upload and attach a new image to the product.
     */
    public function store(UploadProductImageRequest $request, Product $product): JsonResponse
    {
        Gate::authorize('update', $product);

        /** @var User $admin */
        $admin = $request->user();

        $file = $request->file('image');
        if ($file === null) {
            abort(422, 'An image file is required.');
        }

        $storedPath = $file->store('products', 'public');
        if ($storedPath === false) {
            abort(500, 'Failed to store image file.');
        }

        try {
            /** @var ProductImage $productImage */
            $productImage = DB::transaction(function () use ($request, $product, $storedPath, $admin): ProductImage {
                $existingCount = $product->images()->count();

                $isPrimary = $request->has('is_primary')
                    ? $request->boolean('is_primary')
                    : ($existingCount === 0);

                if ($existingCount === 0) {
                    $isPrimary = true;
                }

                if ($isPrimary) {
                    $product->images()->update(['is_primary' => false]);
                }

                $sortOrder = $request->has('sort_order') && $request->input('sort_order') !== null
                    ? (int) $request->input('sort_order')
                    : (($product->images()->max('sort_order') ?? -1) + 1);

                /** @var ProductImage $image */
                $image = $product->images()->create([
                    'path' => $storedPath,
                    'alt_text' => (string) $request->input('alt_text'),
                    'sort_order' => $sortOrder,
                    'is_primary' => $isPrimary,
                ]);

                $this->auditLogger->logCreated($admin, $image);

                return $image;
            });
        } catch (Throwable $e) {
            Storage::disk('public')->delete($storedPath);
            throw $e;
        }

        return (new ProductImageResource($productImage))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Reorder images for a product and optionally designate a new primary image.
     */
    public function reorder(ReorderProductImagesRequest $request, Product $product): AnonymousResourceCollection
    {
        Gate::authorize('update', $product);

        /** @var User $admin */
        $admin = $request->user();

        /** @var list<int> $imageIds */
        $imageIds = $request->input('image_ids');
        $primaryId = $request->filled('primary_id') ? (int) $request->input('primary_id') : null;

        DB::transaction(function () use ($imageIds, $primaryId, $product, $admin): void {
            foreach ($imageIds as $index => $id) {
                ProductImage::query()
                    ->where('id', $id)
                    ->where('product_id', $product->id)
                    ->update(['sort_order' => $index]);
            }

            if ($primaryId !== null) {
                $product->images()->update(['is_primary' => false]);
                ProductImage::query()
                    ->where('id', $primaryId)
                    ->where('product_id', $product->id)
                    ->update(['is_primary' => true]);
            }

            $this->auditLogger->record(
                admin: $admin,
                action: 'product_image.reordered',
                subject: $product,
                changes: [
                    'product_id' => $product->id,
                    'image_ids' => $imageIds,
                    'primary_id' => $primaryId,
                ],
            );
        });

        return ProductImageResource::collection(
            $product->images()->get()
        );
    }

    /**
     * Update product image metadata (alt text, sort order, primary status).
     */
    public function update(
        UpdateProductImageRequest $request,
        Product $product,
        ProductImage $image,
    ): ProductImageResource {
        abort_if($image->product_id !== $product->id, 404);

        Gate::authorize('update', $product);

        /** @var User $admin */
        $admin = $request->user();

        /** @var ProductImage $updatedImage */
        $updatedImage = DB::transaction(function () use ($request, $product, $image, $admin): ProductImage {
            $before = $image->getAttributes();

            if ($request->has('is_primary')) {
                $newPrimary = $request->boolean('is_primary');
                if ($newPrimary) {
                    $product->images()->where('id', '!=', $image->id)->update(['is_primary' => false]);
                    $image->is_primary = true;
                } else {
                    $image->is_primary = false;
                    $other = $product->images()->where('id', '!=', $image->id)->orderBy('sort_order')->first();
                    if ($other !== null) {
                        $other->update(['is_primary' => true]);
                    }
                }
            }

            if ($request->has('alt_text')) {
                $image->alt_text = (string) $request->input('alt_text');
            }

            if ($request->has('sort_order')) {
                $image->sort_order = (int) $request->input('sort_order');
            }

            $image->save();

            $this->auditLogger->logUpdated($admin, $image, $before, $image->getAttributes());

            return $image;
        });

        return new ProductImageResource($updatedImage);
    }

    /**
     * Delete an image from a product and clean up its storage file.
     */
    public function destroy(
        Request $request,
        Product $product,
        ProductImage $image,
    ): Response {
        abort_if($image->product_id !== $product->id, 404);

        Gate::authorize('update', $product);

        /** @var User $admin */
        $admin = $request->user();

        DB::transaction(function () use ($product, $image, $admin): void {
            $before = $image->getAttributes();
            $wasPrimary = (bool) $image->is_primary;
            $filePath = $image->path;

            $image->delete();

            if ($wasPrimary) {
                $nextPrimary = $product->images()->orderBy('sort_order')->orderBy('id')->first();
                if ($nextPrimary !== null) {
                    $nextPrimary->update(['is_primary' => true]);
                }
            }

            if (! empty($filePath) && ! str_starts_with($filePath, 'http://') && ! str_starts_with($filePath, 'https://')) {
                Storage::disk('public')->delete($filePath);
            }

            $this->auditLogger->logDeleted($admin, $image, $before);
        });

        return ApiResponse::noContent();
    }
}
