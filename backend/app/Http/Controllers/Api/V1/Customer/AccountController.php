<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Customer;

use App\Actions\Account\UpdatePassword;
use App\Actions\Account\UpdatePreferences;
use App\Actions\Account\UpdateProfile;
use App\Http\Controllers\Controller;
use App\Http\Requests\Account\UpdatePasswordRequest;
use App\Http\Requests\Account\UpdatePreferencesRequest;
use App\Http\Requests\Account\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class AccountController extends Controller
{
    public function __construct(
        private readonly UpdateProfile $updateProfile,
        private readonly UpdatePassword $updatePassword,
        private readonly UpdatePreferences $updatePreferences,
    ) {}

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        /** @var array{name: string, email: string} $validated */
        $validated = $request->validated();

        $updatedUser = $this->updateProfile->execute(
            user: $user,
            name: $validated['name'],
            email: $validated['email'],
        );

        return (new UserResource($updatedUser))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        /** @var array{password: string} $validated */
        $validated = $request->validated();

        $this->updatePassword->execute($user, $validated['password']);

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return ApiResponse::message('Password updated.');
    }

    public function updatePreferences(UpdatePreferencesRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        /** @var array{budget_default?: int|float|string|null, favourite_categories?: list<string>|null, priorities?: list<string>|null} $validated */
        $validated = $request->validated();

        $updatedUser = $this->updatePreferences->execute(
            user: $user,
            budgetDefault: $validated['budget_default'] ?? null,
            favouriteCategories: $validated['favourite_categories'] ?? [],
            priorities: $validated['priorities'] ?? [],
        );

        return (new UserResource($updatedUser))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }
}
