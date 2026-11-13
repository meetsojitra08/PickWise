<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Customer\AccountController;
use App\Http\Controllers\Api\V1\Customer\ReviewController;
use App\Http\Controllers\Api\V1\Customer\WishlistController;
use App\Http\Controllers\Api\V1\Public\CategoryController;
use App\Http\Controllers\Api\V1\Public\CompareController;
use App\Http\Controllers\Api\V1\Public\HealthController;
use App\Http\Controllers\Api\V1\Public\ProductController;
use App\Http\Controllers\Api\V1\Public\ProductReviewController;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

Route::get('/health', HealthController::class)->name('api.v1.health');

Route::middleware('throttle:public-api')->group(function (): void {
    Route::get('/categories', [CategoryController::class, 'index'])
        ->name('api.v1.categories.index');
    Route::get('/categories/{slug}/filters', [CategoryController::class, 'filters'])
        ->name('api.v1.categories.filters');
    Route::get('/products', [ProductController::class, 'index'])
        ->name('api.v1.products.index');
    Route::get('/products/{slug}', [ProductController::class, 'show'])
        ->name('api.v1.products.show');
    Route::get('/products/{slug}/price-history', [ProductController::class, 'priceHistory'])
        ->name('api.v1.products.price-history');
    Route::get('/products/{slug}/similar', [ProductController::class, 'similar'])
        ->name('api.v1.products.similar');
    Route::get('/products/{slug}/reviews', [ProductReviewController::class, 'index'])
        ->name('api.v1.products.reviews.index');
    Route::post('/compare', CompareController::class)
        ->name('api.v1.compare');
});

Route::post('/products/{slug}/reviews', [ProductReviewController::class, 'store'])
    ->middleware(['auth:sanctum', 'throttle:review-create'])
    ->name('api.v1.products.reviews.store');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::patch('/reviews/{review}', [ReviewController::class, 'update'])
        ->name('api.v1.reviews.update');
    Route::delete('/reviews/{review}', [ReviewController::class, 'destroy'])
        ->name('api.v1.reviews.destroy');
});

Route::prefix('auth')->group(function (): void {
    Route::middleware([
        EncryptCookies::class,
        AddQueuedCookiesToResponse::class,
        StartSession::class,
        PreventRequestForgery::class,
        AuthenticateSession::class,
    ])->withoutMiddleware([
        EnsureFrontendRequestsAreStateful::class,
    ])->group(function (): void {
        Route::post('/register', [AuthController::class, 'register'])
            ->middleware('throttle:register')
            ->name('api.v1.auth.register');
        Route::post('/login', [AuthController::class, 'login'])
            ->middleware('throttle:login')
            ->name('api.v1.auth.login');
        Route::post('/logout', [AuthController::class, 'logout'])
            ->middleware('auth:sanctum')
            ->name('api.v1.auth.logout');
    });

    Route::get('/me', [AuthController::class, 'me'])
        ->middleware('auth:sanctum')
        ->name('api.v1.auth.me');
});

Route::prefix('account')
    ->middleware('auth:sanctum')
    ->group(function (): void {
        Route::patch('/profile', [AccountController::class, 'updateProfile'])
            ->name('api.v1.account.profile.update');
        Route::put('/password', [AccountController::class, 'updatePassword'])
            ->name('api.v1.account.password.update');
        Route::put('/preferences', [AccountController::class, 'updatePreferences'])
            ->name('api.v1.account.preferences.update');
    });

Route::prefix('wishlist')
    ->middleware('auth:sanctum')
    ->group(function (): void {
        Route::get('/', [WishlistController::class, 'index'])
            ->name('api.v1.wishlist.index');
        Route::post('/', [WishlistController::class, 'store'])
            ->name('api.v1.wishlist.store');
        Route::delete('/{productId}', [WishlistController::class, 'destroy'])
            ->whereNumber('productId')
            ->name('api.v1.wishlist.destroy');
    });
