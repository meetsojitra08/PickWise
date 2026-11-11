<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\Public\HealthController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class)->name('api.v1.health');
