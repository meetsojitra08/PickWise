<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\Admin\AdminActivityLogController;
use App\Http\Controllers\Api\V1\Admin\AdminAiUsageController;
use App\Http\Controllers\Api\V1\Admin\AdminBrandController;
use App\Http\Controllers\Api\V1\Admin\AdminCategoryController;
use App\Http\Controllers\Api\V1\Admin\AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\AdminProductController;
use App\Http\Controllers\Api\V1\Admin\AdminProductImageController;
use App\Http\Controllers\Api\V1\Admin\AdminReviewController;
use App\Http\Controllers\Api\V1\Admin\AdminSpecDefinitionController;
use App\Http\Controllers\Api\V1\Admin\AdminUserController;
use App\Http\Controllers\Api\V1\Assistant\ConversationController;
use App\Http\Controllers\Api\V1\Assistant\MessageController;
use App\Http\Controllers\Api\V1\Assistant\QuotaController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Customer\AccountController;
use App\Http\Controllers\Api\V1\Customer\ComparisonController;
use App\Http\Controllers\Api\V1\Customer\ReviewController;
use App\Http\Controllers\Api\V1\Customer\WishlistController;
use App\Http\Controllers\Api\V1\Public\CategoryController;
use App\Http\Controllers\Api\V1\Public\CompareController;
use App\Http\Controllers\Api\V1\Public\CompareVerdictController;
use App\Http\Controllers\Api\V1\Public\HealthController;
use App\Http\Controllers\Api\V1\Public\ProductController;
use App\Http\Controllers\Api\V1\Public\ProductReviewController;
use App\Http\Controllers\Api\V1\Public\SharedComparisonController;
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
    Route::get('/assistant/quota', QuotaController::class)
        ->name('api.v1.assistant.quota');
    Route::get('/shared/comparisons/{token}', SharedComparisonController::class)
        ->whereAlphaNumeric('token')
        ->name('api.v1.shared-comparisons.show');
});

Route::post('/compare/verdict', CompareVerdictController::class)
    ->middleware(['throttle:verdict', 'ai-quota:compare'])
    ->name('api.v1.compare.verdict');

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

Route::prefix('comparisons')
    ->middleware('auth:sanctum')
    ->group(function (): void {
        Route::get('/', [ComparisonController::class, 'index'])
            ->name('api.v1.comparisons.index');
        Route::post('/', [ComparisonController::class, 'store'])
            ->name('api.v1.comparisons.store');
        Route::get('/{comparison}', [ComparisonController::class, 'show'])
            ->whereNumber('comparison')
            ->name('api.v1.comparisons.show');
        Route::patch('/{comparison}', [ComparisonController::class, 'update'])
            ->whereNumber('comparison')
            ->name('api.v1.comparisons.update');
        Route::delete('/{comparison}', [ComparisonController::class, 'destroy'])
            ->whereNumber('comparison')
            ->name('api.v1.comparisons.destroy');
        Route::post('/{comparison}/share', [ComparisonController::class, 'share'])
            ->whereNumber('comparison')
            ->name('api.v1.comparisons.share');
        Route::delete('/{comparison}/share', [ComparisonController::class, 'unshare'])
            ->whereNumber('comparison')
            ->name('api.v1.comparisons.unshare');
    });

Route::prefix('assistant')
    ->middleware('throttle:assistant')
    ->group(function (): void {
        Route::get('/conversations', [ConversationController::class, 'index'])
            ->name('api.v1.assistant.conversations.index');
        Route::post('/conversations', [ConversationController::class, 'store'])
            ->name('api.v1.assistant.conversations.store');
        Route::get('/conversations/{conversation}', [ConversationController::class, 'show'])
            ->whereNumber('conversation')
            ->name('api.v1.assistant.conversations.show');
        Route::delete('/conversations/{conversation}', [ConversationController::class, 'destroy'])
            ->whereNumber('conversation')
            ->name('api.v1.assistant.conversations.destroy');

        Route::post('/conversations/{conversation}/messages', [MessageController::class, 'store'])
            ->whereNumber('conversation')
            ->middleware('ai-quota:assistant')
            ->name('api.v1.assistant.messages.store');
    });

Route::prefix('admin')
    ->middleware(['auth:sanctum', 'role:admin'])
    ->group(function (): void {
        Route::get('/dashboard', AdminDashboardController::class)
            ->name('api.v1.admin.dashboard');
        Route::get('ai/usage', AdminAiUsageController::class)
            ->name('api.v1.admin.ai.usage');
        Route::get('activity-logs', AdminActivityLogController::class)
            ->name('api.v1.admin.activity-logs.index');
        Route::apiResource('categories', AdminCategoryController::class)
            ->names('api.v1.admin.categories');
        Route::apiResource('categories.specs', AdminSpecDefinitionController::class)
            ->scoped()
            ->names('api.v1.admin.categories.specs');
        Route::apiResource('brands', AdminBrandController::class)
            ->names('api.v1.admin.brands');
        Route::patch('products/bulk-status', [AdminProductController::class, 'bulkStatus'])
            ->name('api.v1.admin.products.bulk-status');
        Route::patch('products/{product}/images/reorder', [AdminProductImageController::class, 'reorder'])
            ->name('api.v1.admin.products.images.reorder');
        Route::apiResource('products.images', AdminProductImageController::class)
            ->scoped()
            ->whereNumber('image')
            ->only(['index', 'store', 'update', 'destroy'])
            ->names('api.v1.admin.products.images');
        Route::apiResource('products', AdminProductController::class)
            ->withTrashed()
            ->names('api.v1.admin.products');
        Route::get('users', [AdminUserController::class, 'index'])
            ->name('api.v1.admin.users.index');
        Route::patch('users/{user}', [AdminUserController::class, 'update'])
            ->whereNumber('user')
            ->name('api.v1.admin.users.update');
        Route::post('products/{product}/regenerate-summary', [AdminProductController::class, 'regenerateSummary'])
            ->whereNumber('product')
            ->name('api.v1.admin.products.regenerate-summary');
        Route::patch('reviews/bulk-status', [AdminReviewController::class, 'bulkStatus'])
            ->name('api.v1.admin.reviews.bulk-status');
        Route::get('reviews', [AdminReviewController::class, 'index'])
            ->name('api.v1.admin.reviews.index');
        Route::patch('reviews/{review}', [AdminReviewController::class, 'update'])
            ->whereNumber('review')
            ->name('api.v1.admin.reviews.update');
        Route::delete('reviews/{review}', [AdminReviewController::class, 'destroy'])
            ->whereNumber('review')
            ->name('api.v1.admin.reviews.destroy');
    });
