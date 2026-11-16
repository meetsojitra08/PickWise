<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\ApiErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexCategoriesRequest;
use App\Http\Requests\Admin\StoreCategoryRequest;
use App\Http\Requests\Admin\UpdateCategoryRequest;
use App\Http\Resources\Admin\AdminCategoryResource;
use App\Http\Responses\ApiResponse;
use App\Models\Category;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class AdminCategoryController extends Controller
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
    ) {}

    /**
     * List categories with optional search, active filter, parent filter, and counts.
     */
    public function index(IndexCategoriesRequest $request): AnonymousResourceCollection
    {
        $query = Category::query()
            ->with('parent:id,name,slug')
            ->withCount(['products', 'specDefinitions', 'children']);

        if ($request->filled('search')) {
            $search = (string) $request->input('search');
            $query->where(static function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        if ($request->has('is_active') && $request->input('is_active') !== null) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('parent_id')) {
            $parentId = $request->input('parent_id');
            if ($parentId === 'null' || $parentId === null || $parentId === '') {
                $query->whereNull('parent_id');
            } else {
                $query->where('parent_id', (int) $parentId);
            }
        }

        $perPage = (int) $request->input('per_page', 25);
        $categories = $query->orderBy('sort_order')->orderBy('name')->paginate($perPage);

        return AdminCategoryResource::collection($categories);
    }

    /**
     * Create a new category and log audit trail.
     */
    public function store(StoreCategoryRequest $request): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();

        $category = Category::query()->create($request->validated());
        $category->load('parent:id,name,slug')->loadCount(['products', 'specDefinitions', 'children']);

        $this->auditLogger->logCreated($admin, $category);

        return (new AdminCategoryResource($category))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Display a specific category with its counts and parent.
     */
    public function show(Category $category): AdminCategoryResource
    {
        Gate::authorize('view', $category);

        $category->load('parent:id,name,slug')->loadCount(['products', 'specDefinitions', 'children']);

        return new AdminCategoryResource($category);
    }

    /**
     * Update an existing category and record before/after diff in audit log.
     */
    public function update(UpdateCategoryRequest $request, Category $category): AdminCategoryResource
    {
        /** @var User $admin */
        $admin = $request->user();
        $before = $category->getAttributes();

        $category->update($request->validated());
        $category->load('parent:id,name,slug')->loadCount(['products', 'specDefinitions', 'children']);

        $this->auditLogger->logUpdated($admin, $category, $before, $category->getAttributes());

        return new AdminCategoryResource($category);
    }

    /**
     * Delete a category if it has no products, cascading or clearing relationships, and recording audit log.
     */
    public function destroy(Category $category, Request $request): Response|JsonResponse
    {
        Gate::authorize('delete', $category);

        /** @var User $admin */
        $admin = $request->user();

        if ($category->products()->exists()) {
            return ApiResponse::error(
                code: ApiErrorCode::ValidationFailed,
                message: 'Cannot delete a category that contains products.',
                status: Response::HTTP_UNPROCESSABLE_ENTITY,
                details: ['category' => ['This category has associated products and cannot be deleted.']],
                request: $request,
            );
        }

        $before = $category->getAttributes();
        $category->delete();

        $this->auditLogger->logDeleted($admin, $category, $before);

        return ApiResponse::noContent();
    }
}
