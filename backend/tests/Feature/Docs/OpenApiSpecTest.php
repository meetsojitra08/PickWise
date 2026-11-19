<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

test('openapi specification files exist on disk', function (): void {
    $docsPath = base_path('../docs');
    if (! is_dir($docsPath)) {
        $docsPath = base_path('docs');
    }

    $jsonPath = $docsPath.'/openapi.json';
    $yamlPath = $docsPath.'/openapi.yaml';

    expect(file_exists($jsonPath))->toBeTrue()
        ->and(file_exists($yamlPath))->toBeTrue()
        ->and(filesize($jsonPath))->toBeGreaterThan(10000)
        ->and(filesize($yamlPath))->toBeGreaterThan(10000);
});

test('openapi specification parses and adheres to OpenAPI 3.1 structure', function (): void {
    $docsPath = base_path('../docs');
    if (! is_dir($docsPath)) {
        $docsPath = base_path('docs');
    }

    $jsonContent = (string) file_get_contents($docsPath.'/openapi.json');
    $spec = json_decode($jsonContent, true);

    expect(json_last_error())->toBe(JSON_ERROR_NONE)
        ->and($spec)->toBeArray()
        ->and($spec['openapi'])->toBe('3.1.0')
        ->and($spec['info']['title'])->toBe('Pickwise REST API')
        ->and($spec['info']['version'])->toBe('1.0.0')
        ->and($spec['servers'])->toBeArray()
        ->and(count($spec['servers']))->toBeGreaterThan(0)
        ->and($spec['tags'])->toBeArray()->toHaveCount(17)
        ->and($spec['paths'])->toBeArray()->toHaveCount(49)
        ->and($spec['components']['securitySchemes'])->toHaveKeys(['cookieAuth', 'sanctumCsrf', 'sessionKeyAuth'])
        ->and($spec['components']['schemas'])->toHaveKeys([
            'Money',
            'ApiMeta',
            'ApiLinks',
            'ApiErrorDetail',
            'ApiErrorResponse',
            'ValidationErrorResponse',
            'HealthResponse',
            'User',
            'UserPreferences',
            'CategoryNode',
            'CategoryFilterFacets',
            'Brand',
            'SpecDefinition',
            'ProductImage',
            'ProductSpec',
            'ProductCard',
            'ProductDetail',
            'PaginatedProductsResponse',
            'PriceHistory',
            'Review',
            'PaginatedReviewsResponse',
            'ReviewSummary',
            'CompareMatrix',
            'CompareVerdict',
            'WishlistItem',
            'SavedComparison',
            'AssistantQuota',
            'AssistantConversation',
            'AssistantMessage',
            'AdminDashboard',
            'AdminAiUsage',
            'AdminActivityLog',
        ])
        ->and($spec['components']['responses'])->toHaveKeys([
            'UnauthorizedError',
            'ForbiddenError',
            'NotFoundError',
            'ValidationError',
            'RateLimitError',
            'AiQuotaError',
            'AiUnavailableError',
        ]);
});

test('every registered api v1 route is documented in openapi paths', function (): void {
    $docsPath = base_path('../docs');
    if (! is_dir($docsPath)) {
        $docsPath = base_path('docs');
    }

    $jsonContent = (string) file_get_contents($docsPath.'/openapi.json');
    $spec = json_decode($jsonContent, true);
    $paths = $spec['paths'];

    $apiRoutes = collect(Route::getRoutes()->getRoutes())
        ->filter(fn (Illuminate\Routing\Route $route): bool => str_starts_with($route->uri(), 'api/v1/'))
        ->values();

    expect($apiRoutes->isNotEmpty())->toBeTrue();

    foreach ($apiRoutes as $route) {
        $uri = $route->uri();
        // Strip 'api/v1' prefix
        $path = substr($uri, strlen('api/v1'));
        if (! str_starts_with($path, '/')) {
            $path = '/'.$path;
        }

        // Normalize scoped parameters like {category:} -> {category}
        $normalizedPath = (string) preg_replace('/\{([a-zA-Z0-9_]+):\}/', '{$1}', $path);

        expect(array_key_exists($normalizedPath, $paths))->toBeTrue();

        $pathItem = $paths[$normalizedPath];
        $methods = array_filter(
            $route->methods(),
            fn (string $m): bool => $m !== 'HEAD'
        );

        foreach ($methods as $method) {
            $lowerMethod = strtolower($method);
            expect(array_key_exists($lowerMethod, $pathItem))->toBeTrue();

            $operation = $pathItem[$lowerMethod];
            expect($operation)->toHaveKeys(['tags', 'summary', 'operationId', 'responses'])
                ->and($operation['responses'])->not->toBeEmpty();
        }
    }
});

test('all schema and response references resolve internally', function (): void {
    $docsPath = base_path('../docs');
    if (! is_dir($docsPath)) {
        $docsPath = base_path('docs');
    }

    $jsonContent = (string) file_get_contents($docsPath.'/openapi.json');
    $spec = json_decode($jsonContent, true);

    $schemas = array_keys($spec['components']['schemas']);
    $responses = array_keys($spec['components']['responses']);

    // Find all "$ref" values across the entire document
    $refs = [];
    $collectRefs = function ($item) use (&$collectRefs, &$refs): void {
        if (! is_array($item)) {
            return;
        }
        foreach ($item as $k => $v) {
            if ($k === '$ref' && is_string($v)) {
                $refs[] = $v;
            } elseif (is_array($v)) {
                $collectRefs($v);
            }
        }
    };
    $collectRefs($spec);

    expect(count($refs))->toBeGreaterThan(0);

    foreach (array_unique($refs) as $ref) {
        if (str_starts_with($ref, '#/components/schemas/')) {
            $name = substr($ref, strlen('#/components/schemas/'));
            expect(in_array($name, $schemas, true))->toBeTrue();
        } elseif (str_starts_with($ref, '#/components/responses/')) {
            $name = substr($ref, strlen('#/components/responses/'));
            expect(in_array($name, $responses, true))->toBeTrue();
        } else {
            expect(false)->toBeTrue("Unexpected reference format: {$ref}");
        }
    }
});
