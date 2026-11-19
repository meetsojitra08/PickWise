<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexUsersRequest;
use App\Http\Requests\Admin\UpdateAdminUserRequest;
use App\Http\Resources\Admin\AdminUserResource;
use App\Models\User;
use App\Services\AuditLogger;
use App\Support\LikePattern;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

final class AdminUserController extends Controller
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
    ) {}

    /**
     * List users with search, role, active status, and review count.
     */
    public function index(IndexUsersRequest $request): AnonymousResourceCollection
    {
        $query = User::query()->withCount('reviews');

        $search = (string) ($request->input('search') ?? $request->input('q') ?? '');
        if (trim($search) !== '') {
            $pattern = LikePattern::containsLower($search);
            $query->where(static function ($q) use ($pattern): void {
                $q->whereRaw("LOWER(name) LIKE ? ESCAPE '!'", [$pattern])
                    ->orWhereRaw("LOWER(email) LIKE ? ESCAPE '!'", [$pattern]);
            });
        }

        if ($request->filled('role')) {
            $query->where('role', $request->input('role'));
        }

        if ($request->has('is_active') && $request->input('is_active') !== null) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $sort = (string) $request->input('sort', '-created_at');
        match ($sort) {
            'name' => $query->orderBy('name')->orderBy('id'),
            '-name' => $query->orderByDesc('name')->orderByDesc('id'),
            'email' => $query->orderBy('email')->orderBy('id'),
            '-email' => $query->orderByDesc('email')->orderByDesc('id'),
            'created_at' => $query->orderBy('created_at')->orderBy('id'),
            '-created_at' => $query->orderByDesc('created_at')->orderByDesc('id'),
            'reviews_count' => $query->orderBy('reviews_count')->orderBy('id'),
            '-reviews_count' => $query->orderByDesc('reviews_count')->orderByDesc('id'),
            default => $query->orderByDesc('created_at')->orderByDesc('id'),
        };

        $perPage = (int) $request->input('per_page', 25);
        $users = $query->paginate($perPage);

        return AdminUserResource::collection($users);
    }

    /**
     * Update user active status or role and record audit trail.
     *
     * @throws ValidationException
     */
    public function update(UpdateAdminUserRequest $request, User $user): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();

        $isCurrentlyActiveAdmin = $user->isAdmin() && $user->isActive();
        $willDeactivate = $request->has('is_active') && ! $request->boolean('is_active');
        $willDemote = $request->has('role') && $request->enum('role', UserRole::class) === UserRole::Customer;

        if ($isCurrentlyActiveAdmin && ($willDeactivate || $willDemote)) {
            $otherActiveAdminsCount = User::query()
                ->where('role', UserRole::Admin)
                ->where('is_active', true)
                ->where('id', '!=', $user->id)
                ->count();

            if ($otherActiveAdminsCount === 0) {
                throw ValidationException::withMessages([
                    'role' => ['Cannot deactivate or demote the last remaining active administrator.'],
                ]);
            }
        }

        $before = $user->getAttributes();

        if ($request->has('is_active')) {
            $user->is_active = $request->boolean('is_active');
        }

        if ($request->has('role')) {
            $user->role = $request->enum('role', UserRole::class);
        }

        $user->save();
        $after = $user->getAttributes();
        $user->loadCount('reviews');

        $this->auditLogger->logUpdated(
            admin: $admin,
            subject: $user,
            before: $before,
            after: $after,
            action: 'user.updated',
        );

        return (new AdminUserResource($user))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }
}
