<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\ApiErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexBrandsRequest;
use App\Http\Requests\Admin\StoreBrandRequest;
use App\Http\Requests\Admin\UpdateBrandRequest;
use App\Http\Resources\Admin\AdminBrandResource;
use App\Http\Responses\ApiResponse;
use App\Models\Brand;
use App\Models\User;
use App\Services\AuditLogger;
use App\Support\LikePattern;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class AdminBrandController extends Controller
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
    ) {}

    /**
     * List brands with search and product count.
     */
    public function index(IndexBrandsRequest $request): AnonymousResourceCollection
    {
        $query = Brand::query()->withCount('products');

        if ($request->filled('search')) {
            $pattern = LikePattern::containsLower((string) $request->input('search'));
            $query->where(static function ($q) use ($pattern): void {
                $q->whereRaw("LOWER(name) LIKE ? ESCAPE '!'", [$pattern])
                    ->orWhereRaw("LOWER(slug) LIKE ? ESCAPE '!'", [$pattern]);
            });
        }

        $sort = (string) $request->input('sort', 'name');
        match ($sort) {
            '-name' => $query->orderByDesc('name'),
            'created_at' => $query->orderBy('created_at')->orderBy('id'),
            '-created_at' => $query->orderByDesc('created_at')->orderByDesc('id'),
            default => $query->orderBy('name')->orderBy('id'),
        };

        $perPage = (int) $request->input('per_page', 25);
        $brands = $query->paginate($perPage);

        return AdminBrandResource::collection($brands);
    }

    /**
     * Create a new brand and log audit trail.
     */
    public function store(StoreBrandRequest $request): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();

        $brand = Brand::query()->create($request->validated());
        $brand->loadCount('products');

        $this->auditLogger->logCreated($admin, $brand);

        return (new AdminBrandResource($brand))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Display a specific brand with its product count.
     */
    public function show(Brand $brand): AdminBrandResource
    {
        Gate::authorize('view', $brand);

        $brand->loadCount('products');

        return new AdminBrandResource($brand);
    }

    /**
     * Update an existing brand and record before/after diff in audit log.
     */
    public function update(UpdateBrandRequest $request, Brand $brand): AdminBrandResource
    {
        /** @var User $admin */
        $admin = $request->user();
        $before = $brand->getAttributes();

        $brand->update($request->validated());
        $brand->loadCount('products');

        $this->auditLogger->logUpdated($admin, $brand, $before, $brand->getAttributes());

        return new AdminBrandResource($brand);
    }

    /**
     * Delete a brand if it has no products, and record audit log.
     */
    public function destroy(Brand $brand, Request $request): Response|JsonResponse
    {
        Gate::authorize('delete', $brand);

        /** @var User $admin */
        $admin = $request->user();

        if ($brand->products()->withTrashed()->exists()) {
            return ApiResponse::error(
                code: ApiErrorCode::ValidationFailed,
                message: 'Cannot delete a brand that contains products.',
                status: Response::HTTP_UNPROCESSABLE_ENTITY,
                details: ['brand' => ['This brand has associated products and cannot be deleted.']],
                request: $request,
            );
        }

        $before = $brand->getAttributes();
        $brand->delete();

        $this->auditLogger->logDeleted($admin, $brand, $before);

        return ApiResponse::noContent();
    }
}
