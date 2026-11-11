<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Customer\AccountController;
use App\Http\Controllers\Api\V1\Public\HealthController;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

Route::get('/health', HealthController::class)->name('api.v1.health');

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
