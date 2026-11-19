<?php

declare(strict_types=1);

$rawOrigins = (string) env('CORS_ALLOWED_ORIGINS', (string) env('APP_URL', 'http://localhost:8080'));
$allowedOrigins = array_values(array_filter(
    array_map('trim', explode(',', $rawOrigins)),
    static fn (string $origin): bool => $origin !== '' && $origin !== '*',
));

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Pickwise serves the SPA and API same-origin through Nginx. Never allow
    | wildcard ("*") origins on credentialed Sanctum cookie endpoints.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => [
        'Accept',
        'Content-Type',
        'X-Requested-With',
        'X-XSRF-TOKEN',
        'X-Request-Id',
        'X-Session-Key',
    ],

    'exposed_headers' => ['X-Request-Id'],

    'max_age' => 0,

    'supports_credentials' => true,

];
