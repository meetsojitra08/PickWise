<?php

declare(strict_types=1);

namespace App\Providers;

use App\Enums\ApiErrorCode;
use App\Http\Responses\ApiResponse;
use App\Models\Comparison;
use App\Models\Review;
use App\Models\User;
use App\Models\WishlistItem;
use App\Policies\ComparisonPolicy;
use App\Policies\ReviewPolicy;
use App\Policies\UserPolicy;
use App\Policies\WishlistItemPolicy;
use Closure;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();
        $this->configureAuthorization();
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('login', function (Request $request): Limit {
            $rawEmail = $request->input('email');
            $email = is_string($rawEmail) ? Str::transliterate(Str::lower(trim($rawEmail))) : '';
            $ip = $request->ip() ?? 'unknown';

            return Limit::perMinute(5)
                ->by($email.'|'.$ip)
                ->response($this->rateLimitedResponse('Too many attempts. Try again in a minute.'));
        });

        RateLimiter::for('register', function (Request $request): Limit {
            $ip = $request->ip() ?? 'unknown';

            return Limit::perHour(5)
                ->by($ip)
                ->response($this->rateLimitedResponse('Too many registration attempts. Please try again later.'));
        });

        RateLimiter::for('public-api', function (Request $request): Limit {
            $ip = $request->ip() ?? 'unknown';

            return Limit::perMinute(120)
                ->by($ip)
                ->response($this->rateLimitedResponse('Too many requests. Please try again in a minute.'));
        });

        RateLimiter::for('review-create', function (Request $request): Limit {
            $userId = $request->user()?->getAuthIdentifier() ?? 'guest';

            return Limit::perHour(5)
                ->by((string) $userId)
                ->response($this->rateLimitedResponse('You have submitted too many reviews. Please try again later.'));
        });
    }

    private function configureAuthorization(): void
    {
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Review::class, ReviewPolicy::class);
        Gate::policy(WishlistItem::class, WishlistItemPolicy::class);
        Gate::policy(Comparison::class, ComparisonPolicy::class);

        Gate::define(
            'access-admin',
            static fn (User $user): bool => $user->isActive() && $user->isAdmin(),
        );
    }

    /**
     * Build a consistent 429 JSON error response callback preserving rate-limit headers.
     *
     * @return Closure(Request, array<string, mixed>): JsonResponse
     */
    private function rateLimitedResponse(string $message): Closure
    {
        return static function (Request $request, array $headers) use ($message): JsonResponse {
            $normalizedHeaders = [];

            foreach ($headers as $name => $value) {
                if (is_string($name) && (is_string($value) || is_int($value))) {
                    $normalizedHeaders[$name] = (string) $value;
                }
            }

            return ApiResponse::error(
                code: ApiErrorCode::RateLimited,
                message: $message,
                status: Response::HTTP_TOO_MANY_REQUESTS,
                request: $request,
                headers: $normalizedHeaders,
            );
        };
    }
}
