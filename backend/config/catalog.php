<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Catalog Filter Facets Cache TTL
    |--------------------------------------------------------------------------
    |
    | Duration in seconds that category filter facets are cached in Redis.
    | Default is 3600 seconds (1 hour). Proactively invalidated on admin mutations.
    |
    */
    'facets_cache_ttl' => (int) env('CATALOG_FACETS_CACHE_TTL', 3600),
];
