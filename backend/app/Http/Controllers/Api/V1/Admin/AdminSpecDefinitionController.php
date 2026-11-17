<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexSpecDefinitionsRequest;
use App\Http\Requests\Admin\StoreSpecDefinitionRequest;
use App\Http\Requests\Admin\UpdateSpecDefinitionRequest;
use App\Http\Resources\Admin\AdminSpecDefinitionResource;
use App\Http\Responses\ApiResponse;
use App\Models\Category;
use App\Models\SpecDefinition;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class AdminSpecDefinitionController extends Controller
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
    ) {}

    /**
     * List all spec definitions defined for the specified category.
     */
    public function index(IndexSpecDefinitionsRequest $request, Category $category): AnonymousResourceCollection
    {
        $query = $category->specDefinitions()->withCount('productSpecs');

        if ($request->filled('search')) {
            $search = (string) $request->input('search');
            $query->where(static function ($q) use ($search): void {
                $q->where('label', 'like', "%{$search}%")
                    ->orWhere('key', 'like', "%{$search}%");
            });
        }

        $specs = $query->orderBy('sort_order')->orderBy('id')->get();

        return AdminSpecDefinitionResource::collection($specs);
    }

    /**
     * Create a new spec definition for the category and record audit log.
     */
    public function store(StoreSpecDefinitionRequest $request, Category $category): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();

        /** @var SpecDefinition $specDefinition */
        $specDefinition = $category->specDefinitions()->create($request->validated());
        $specDefinition->loadCount('productSpecs');

        $this->auditLogger->logCreated($admin, $specDefinition);

        return (new AdminSpecDefinitionResource($specDefinition))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Display a specific spec definition.
     */
    public function show(Category $category, SpecDefinition $spec): AdminSpecDefinitionResource
    {
        Gate::authorize('view', $spec);

        $spec->loadCount('productSpecs');

        return new AdminSpecDefinitionResource($spec);
    }

    /**
     * Update an existing spec definition and log before/after diff.
     */
    public function update(
        UpdateSpecDefinitionRequest $request,
        Category $category,
        SpecDefinition $spec,
    ): AdminSpecDefinitionResource {
        /** @var User $admin */
        $admin = $request->user();
        $before = $spec->getAttributes();

        $spec->update($request->validated());
        $spec->loadCount('productSpecs');

        $this->auditLogger->logUpdated($admin, $spec, $before, $spec->getAttributes());

        return new AdminSpecDefinitionResource($spec);
    }

    /**
     * Delete a spec definition, cascading to product specs and logging deletion.
     */
    public function destroy(Category $category, SpecDefinition $spec, Request $request): Response
    {
        Gate::authorize('delete', $spec);

        /** @var User $admin */
        $admin = $request->user();
        $before = $spec->getAttributes();

        $spec->delete();

        $this->auditLogger->logDeleted($admin, $spec, $before);

        return ApiResponse::noContent();
    }
}
