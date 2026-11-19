<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

final class GenerateOpenApiSpecCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'openapi:generate {--dry-run : Validate and show stats without writing files}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate canonical OpenAPI 3.1.0 specification files in docs/';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $spec = self::buildSpecification();

        $docsPath = base_path('../docs');
        if (! File::isDirectory($docsPath)) {
            $docsPath = base_path('docs');
        }

        $jsonContent = json_encode($spec, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n";
        $yamlContent = self::dumpYaml($spec);

        $pathCount = count($spec['paths']);
        $tagCount = count($spec['tags']);
        $schemaCount = count($spec['components']['schemas']);

        if ($this->option('dry-run')) {
            $this->info("Dry run succeeded. Spec contains {$pathCount} paths, {$tagCount} tags, and {$schemaCount} schemas.");

            return self::SUCCESS;
        }

        File::ensureDirectoryExists($docsPath);

        $jsonFile = $docsPath.'/openapi.json';
        $yamlFile = $docsPath.'/openapi.yaml';

        File::put($jsonFile, $jsonContent);
        File::put($yamlFile, $yamlContent);

        $this->info('Generated OpenAPI 3.1.0 specification successfully:');
        $this->line("  - JSON: {$jsonFile} (".strlen($jsonContent).' bytes)');
        $this->line("  - YAML: {$yamlFile} (".strlen($yamlContent).' bytes)');
        $this->line("  - Paths: {$pathCount}");
        $this->line("  - Schemas: {$schemaCount}");

        return self::SUCCESS;
    }

    /**
     * Construct the complete OpenAPI 3.1.0 data structure.
     *
     * @return array<string, mixed>
     */
    public static function buildSpecification(): array
    {
        return [
            'openapi' => '3.1.0',
            'info' => [
                'title' => 'Pickwise REST API',
                'version' => '1.0.0',
                'description' => "Pickwise REST API documentation.\n\nPickwise is an intelligent, AI-grounded product discovery and comparison platform. All endpoints return standardized JSON envelopes. Public endpoints allow browsing and searching products, filter facets, and comparing items. Authenticated endpoints allow managing wishlists, reviews, saved comparisons, and AI shopping assistant conversations. Administrative endpoints provide category, spec definition, brand, product, user, review moderation, AI telemetry, and audit log management.\n\n### Authentication\n- **Session Cookie:** Laravel Sanctum HttpOnly session cookie (`laravel_session`) established via `POST /api/v1/auth/login` or `POST /api/v1/auth/register`.\n- **CSRF Defense:** Single Page Application mutations require `X-XSRF-TOKEN` header populated from `GET /sanctum/csrf-cookie`.\n- **Guest Assistant Sessions:** Unauthenticated shoppers may pass an `X-Session-Key` header (8 to 128 characters) to maintain ephemeral assistant conversation history.\n\n### Rate Limits\n- Public API: 120 requests / minute per IP.\n- Login: 5 requests / minute per IP + email.\n- Register: 5 requests / hour per IP.\n- Assistant & Verdict: 10 requests / minute per client + daily AI quota (Redis counter).\n- Review submission: 5 requests / hour per user.",
                'contact' => [
                    'name' => 'Pickwise Engineering',
                    'email' => 'dev@pickwise.local',
                ],
                'license' => [
                    'name' => 'MIT',
                    'url' => 'https://opensource.org/licenses/MIT',
                ],
            ],
            'servers' => [
                [
                    'url' => '/api/v1',
                    'description' => 'Current host relative API root',
                ],
                [
                    'url' => 'http://localhost:8080/api/v1',
                    'description' => 'Local Docker development environment',
                ],
            ],
            'tags' => [
                ['name' => 'System', 'description' => 'Service availability and dependency health status'],
                ['name' => 'Auth', 'description' => 'Customer registration, authentication, and session termination'],
                ['name' => 'Account', 'description' => 'Shopper profile, password, and preference management'],
                ['name' => 'Catalog', 'description' => 'Category hierarchies, dynamic filter facets, and product search'],
                ['name' => 'Compare', 'description' => 'Comparable spec matrix and AI-grounded verdict evaluation'],
                ['name' => 'Reviews', 'description' => 'Customer product review authoring and self-service updates'],
                ['name' => 'Wishlist', 'description' => 'Customer saved products and wishlist management'],
                ['name' => 'Saved Comparisons', 'description' => 'Persistent comparisons and public shareable URLs'],
                ['name' => 'Assistant', 'description' => 'AI shopping assistant threads, grounded picks, and daily quota'],
                ['name' => 'Admin Dashboard', 'description' => 'Operational KPI metrics, catalog counts, and system activity'],
                ['name' => 'Admin Categories', 'description' => 'Category hierarchy CRUD and category-scoped spec definitions'],
                ['name' => 'Admin Brands', 'description' => 'Brand entity management'],
                ['name' => 'Admin Products', 'description' => 'Product catalog lifecycle, bulk publishing, images, and AI summaries'],
                ['name' => 'Admin Users', 'description' => 'Customer and administrator accounts, roles, and activation status'],
                ['name' => 'Admin Reviews', 'description' => 'Review moderation queue, bulk approvals, and deletions'],
                ['name' => 'Admin AI Usage', 'description' => 'LLM telemetry, timeseries usage, top consumers, and audit logs'],
                ['name' => 'Admin Activity Logs', 'description' => 'Append-only administrative audit log viewer with attribute diffs'],
            ],
            'paths' => self::buildPaths(),
            'components' => [
                'securitySchemes' => [
                    'cookieAuth' => [
                        'type' => 'apiKey',
                        'in' => 'cookie',
                        'name' => 'laravel_session',
                        'description' => 'Laravel Sanctum HttpOnly session cookie.',
                    ],
                    'sanctumCsrf' => [
                        'type' => 'apiKey',
                        'in' => 'header',
                        'name' => 'X-XSRF-TOKEN',
                        'description' => 'CSRF token obtained from GET /sanctum/csrf-cookie.',
                    ],
                    'sessionKeyAuth' => [
                        'type' => 'apiKey',
                        'in' => 'header',
                        'name' => 'X-Session-Key',
                        'description' => 'Client-generated persistent session key for guest shoppers.',
                    ],
                ],
                'schemas' => self::buildSchemas(),
                'responses' => self::buildResponses(),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function buildPaths(): array
    {
        return [
            '/health' => [
                'get' => [
                    'tags' => ['System'],
                    'summary' => 'System health status',
                    'description' => 'Checks database and Redis connectivity, returning operational status.',
                    'operationId' => 'getHealth',
                    'responses' => [
                        '200' => [
                            'description' => 'All systems operational',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/HealthResponse']]],
                        ],
                        '503' => [
                            'description' => 'One or more subsystem dependencies are unreachable',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/ApiErrorResponse']]],
                        ],
                    ],
                ],
            ],
            '/auth/register' => [
                'post' => [
                    'tags' => ['Auth'],
                    'summary' => 'Register a customer account',
                    'description' => 'Creates a new customer account and establishes an authenticated session.',
                    'operationId' => 'register',
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/RegisterRequest']]],
                    ],
                    'responses' => [
                        '201' => [
                            'description' => 'Account created and session authenticated',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/SingleUserResponse']]],
                        ],
                        '422' => [
                            'description' => 'Validation error (e.g. duplicate email, password mismatch)',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/ValidationErrorResponse']]],
                        ],
                        '429' => [
                            'description' => 'Rate limit exceeded (5 registrations/hour per IP)',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/ApiErrorResponse']]],
                        ],
                    ],
                ],
            ],
            '/auth/login' => [
                'post' => [
                    'tags' => ['Auth'],
                    'summary' => 'Customer or administrator login',
                    'description' => 'Authenticates credentials and establishes a session cookie.',
                    'operationId' => 'login',
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/LoginRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Authentication successful',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/SingleUserResponse']]],
                        ],
                        '422' => [
                            'description' => 'Invalid credentials or inactive account',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/ValidationErrorResponse']]],
                        ],
                        '429' => [
                            'description' => 'Rate limit exceeded (5 attempts/min per IP+email)',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/ApiErrorResponse']]],
                        ],
                    ],
                ],
            ],
            '/auth/logout' => [
                'post' => [
                    'tags' => ['Auth'],
                    'summary' => 'Logout',
                    'description' => 'Invalidates current session cookie and CSRF token.',
                    'operationId' => 'logout',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'responses' => [
                        '200' => [
                            'description' => 'Successfully logged out',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['type' => 'object', 'properties' => ['message' => ['type' => 'string', 'example' => 'Logged out successfully.']]]]]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                    ],
                ],
            ],
            '/auth/me' => [
                'get' => [
                    'tags' => ['Auth'],
                    'summary' => 'Current user profile',
                    'description' => 'Returns authenticated user attributes, role, and preferences.',
                    'operationId' => 'getMe',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'responses' => [
                        '200' => [
                            'description' => 'Authenticated user profile',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/SingleUserResponse']]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                    ],
                ],
            ],
            '/account/profile' => [
                'patch' => [
                    'tags' => ['Account'],
                    'summary' => 'Update profile details',
                    'description' => 'Updates name and email for the authenticated customer.',
                    'operationId' => 'updateProfile',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/UpdateProfileRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Profile updated successfully',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/SingleUserResponse']]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
            ],
            '/account/password' => [
                'put' => [
                    'tags' => ['Account'],
                    'summary' => 'Change password',
                    'description' => 'Changes the customer password after verifying the current password.',
                    'operationId' => 'updatePassword',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/UpdatePasswordRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Password changed successfully',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['type' => 'object', 'properties' => ['message' => ['type' => 'string', 'example' => 'Password updated successfully.']]]]]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
            ],
            '/account/preferences' => [
                'put' => [
                    'tags' => ['Account'],
                    'summary' => 'Update shopping preferences',
                    'description' => 'Saves preferred budget, favorite category slugs, and prioritized specification keys.',
                    'operationId' => 'updatePreferences',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/UpdatePreferencesRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Preferences saved',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/SingleUserResponse']]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
            ],
            '/categories' => [
                'get' => [
                    'tags' => ['Catalog'],
                    'summary' => 'List category tree',
                    'description' => 'Retrieves hierarchical categories with published product counts.',
                    'operationId' => 'getCategories',
                    'responses' => [
                        '200' => [
                            'description' => 'Category collection',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/CategoryNode']]], 'required' => ['data']]]],
                        ],
                    ],
                ],
            ],
            '/categories/{slug}/filters' => [
                'get' => [
                    'tags' => ['Catalog'],
                    'summary' => 'Category filter facets',
                    'description' => 'Returns dynamic filter facets (price range, brands, filterable specs) for a category.',
                    'operationId' => 'getCategoryFilters',
                    'parameters' => [
                        ['name' => 'slug', 'in' => 'path', 'required' => true, 'description' => 'Category slug identifier', 'schema' => ['type' => 'string']],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Filter facets for category',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/CategoryFilterFacets']], 'required' => ['data']]]],
                        ],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
            ],
            '/products' => [
                'get' => [
                    'tags' => ['Catalog'],
                    'summary' => 'Search and filter catalog products',
                    'description' => 'Search products with PostgreSQL trigram typo tolerance, multi-facet filtering, sorting, and pagination.',
                    'operationId' => 'getProducts',
                    'parameters' => [
                        ['name' => 'q', 'in' => 'query', 'description' => 'Keyword search term', 'schema' => ['type' => 'string']],
                        ['name' => 'category', 'in' => 'query', 'description' => 'Category slug filter', 'schema' => ['type' => 'string']],
                        ['name' => 'brand', 'in' => 'query', 'description' => 'Filter by brand slugs', 'schema' => ['type' => 'array', 'items' => ['type' => 'string']]],
                        ['name' => 'price_min', 'in' => 'query', 'description' => 'Minimum price filter', 'schema' => ['type' => 'number']],
                        ['name' => 'price_max', 'in' => 'query', 'description' => 'Maximum price filter', 'schema' => ['type' => 'number']],
                        ['name' => 'rating_min', 'in' => 'query', 'description' => 'Minimum average rating filter (1-5)', 'schema' => ['type' => 'number', 'minimum' => 1, 'maximum' => 5]],
                        ['name' => 'availability', 'in' => 'query', 'description' => 'Stock status filter', 'schema' => ['type' => 'string', 'enum' => ['in_stock', 'all']]],
                        ['name' => 'spec', 'in' => 'query', 'description' => 'Specification filters: spec[ram_gb]=16 or spec[price]=1000:5000', 'schema' => ['type' => 'object']],
                        ['name' => 'sort', 'in' => 'query', 'description' => 'Ordering strategy', 'schema' => ['type' => 'string', 'enum' => ['relevance', 'price_asc', 'price_desc', 'rating', 'value', 'newest'], 'default' => 'relevance']],
                        ['name' => 'page', 'in' => 'query', 'description' => 'Page number', 'schema' => ['type' => 'integer', 'default' => 1]],
                        ['name' => 'per_page', 'in' => 'query', 'description' => 'Items per page (max 48)', 'schema' => ['type' => 'integer', 'maximum' => 48, 'default' => 24]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Paginated product cards',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/PaginatedProductsResponse']]],
                        ],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
            ],
            '/products/{slug}' => [
                'get' => [
                    'tags' => ['Catalog'],
                    'summary' => 'Product detail',
                    'description' => 'Returns complete product details including specs, images, value score, and AI review summary.',
                    'operationId' => 'getProductBySlug',
                    'parameters' => [
                        ['name' => 'slug', 'in' => 'path', 'required' => true, 'description' => 'Product unique slug', 'schema' => ['type' => 'string']],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Product detailed specification',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/ProductDetail']], 'required' => ['data']]]],
                        ],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
            ],
            '/products/{slug}/price-history' => [
                'get' => [
                    'tags' => ['Catalog'],
                    'summary' => 'Price history series',
                    'description' => 'Chronological price history data points for charting pricing trends.',
                    'operationId' => 'getProductPriceHistory',
                    'parameters' => [
                        ['name' => 'slug', 'in' => 'path', 'required' => true, 'description' => 'Product slug', 'schema' => ['type' => 'string']],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Price history points',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/PriceHistory']], 'required' => ['data']]]],
                        ],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
            ],
            '/products/{slug}/similar' => [
                'get' => [
                    'tags' => ['Catalog'],
                    'summary' => 'Similar products',
                    'description' => 'Finds similar products within the same category matching price and specification proximity.',
                    'operationId' => 'getSimilarProducts',
                    'parameters' => [
                        ['name' => 'slug', 'in' => 'path', 'required' => true, 'description' => 'Product slug', 'schema' => ['type' => 'string']],
                        ['name' => 'limit', 'in' => 'query', 'description' => 'Maximum number of items (max 10)', 'schema' => ['type' => 'integer', 'maximum' => 10, 'default' => 4]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Collection of similar products',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/ProductCard']]], 'required' => ['data']]]],
                        ],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
            ],
            '/products/{slug}/reviews' => [
                'get' => [
                    'tags' => ['Reviews'],
                    'summary' => 'List approved reviews',
                    'description' => 'Lists paginated approved reviews for a product along with rating aggregates.',
                    'operationId' => 'getProductReviews',
                    'parameters' => [
                        ['name' => 'slug', 'in' => 'path', 'required' => true, 'description' => 'Product slug', 'schema' => ['type' => 'string']],
                        ['name' => 'page', 'in' => 'query', 'schema' => ['type' => 'integer', 'default' => 1]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Paginated reviews collection',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/PaginatedReviewsResponse']]],
                        ],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
                'post' => [
                    'tags' => ['Reviews'],
                    'summary' => 'Submit a product review',
                    'description' => 'Submits a customer review for moderation. Throttled to 5 submissions/hour.',
                    'operationId' => 'storeProductReview',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'slug', 'in' => 'path', 'required' => true, 'description' => 'Product slug', 'schema' => ['type' => 'string']],
                    ],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/StoreReviewRequest']]],
                    ],
                    'responses' => [
                        '201' => [
                            'description' => 'Review submitted for moderation',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/Review']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                        '429' => ['$ref' => '#/components/responses/RateLimitError'],
                    ],
                ],
            ],
            '/reviews/{review}' => [
                'patch' => [
                    'tags' => ['Reviews'],
                    'summary' => 'Update own review',
                    'description' => 'Edits an existing customer review authored by the current user.',
                    'operationId' => 'updateReview',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'review', 'in' => 'path', 'required' => true, 'description' => 'Review ID', 'schema' => ['type' => 'integer']],
                    ],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/UpdateReviewRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Review updated',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/Review']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
                'delete' => [
                    'tags' => ['Reviews'],
                    'summary' => 'Delete own review',
                    'description' => 'Deletes a review authored by the authenticated customer.',
                    'operationId' => 'deleteReview',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'review', 'in' => 'path', 'required' => true, 'description' => 'Review ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '204' => ['description' => 'Review deleted successfully'],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
            ],
            '/compare' => [
                'post' => [
                    'tags' => ['Compare'],
                    'summary' => 'Generate spec comparison matrix',
                    'description' => 'Compares 2 to 4 products from the same category. Computes per-row winners based on spec definitions.',
                    'operationId' => 'compareProducts',
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/CompareRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Comparison matrix with winner indicators',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/CompareMatrix']], 'required' => ['data']]]],
                        ],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
            ],
            '/compare/verdict' => [
                'post' => [
                    'tags' => ['Compare'],
                    'summary' => 'AI comparison verdict',
                    'description' => 'Generates an AI-grounded verdict explaining strengths, trade-offs, and picks. Subject to daily quota.',
                    'operationId' => 'getCompareVerdict',
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/CompareVerdictRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'AI generated comparison verdict',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/CompareVerdict']], 'required' => ['data']]]],
                        ],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                        '429' => [
                            'description' => 'Daily AI quota exceeded (HTTP 429 ai_quota_exceeded)',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/ApiErrorResponse']]],
                        ],
                        '503' => [
                            'description' => 'AI inference service unavailable',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/ApiErrorResponse']]],
                        ],
                    ],
                ],
            ],
            '/wishlist' => [
                'get' => [
                    'tags' => ['Wishlist'],
                    'summary' => 'List wishlist items',
                    'description' => 'Returns all products saved by the authenticated customer.',
                    'operationId' => 'getWishlist',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'responses' => [
                        '200' => [
                            'description' => 'Customer wishlist',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/WishlistItem']]], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                    ],
                ],
                'post' => [
                    'tags' => ['Wishlist'],
                    'summary' => 'Add product to wishlist',
                    'description' => 'Adds a product to the customer wishlist (idempotent).',
                    'operationId' => 'addToWishlist',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/StoreWishlistRequest']]],
                    ],
                    'responses' => [
                        '201' => [
                            'description' => 'Product added to wishlist',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/WishlistItem']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
            ],
            '/wishlist/{productId}' => [
                'delete' => [
                    'tags' => ['Wishlist'],
                    'summary' => 'Remove product from wishlist',
                    'description' => 'Removes a product from the authenticated customer wishlist.',
                    'operationId' => 'removeFromWishlist',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'productId', 'in' => 'path', 'required' => true, 'description' => 'Product ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '204' => ['description' => 'Product removed from wishlist'],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                    ],
                ],
            ],
            '/comparisons' => [
                'get' => [
                    'tags' => ['Saved Comparisons'],
                    'summary' => 'List saved comparisons',
                    'description' => 'Retrieves all comparisons saved by the authenticated customer.',
                    'operationId' => 'getComparisons',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'responses' => [
                        '200' => [
                            'description' => 'Saved comparisons list',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/SavedComparison']]], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                    ],
                ],
                'post' => [
                    'tags' => ['Saved Comparisons'],
                    'summary' => 'Save a comparison',
                    'description' => 'Persists a named multi-product comparison with optional AI verdict.',
                    'operationId' => 'storeComparison',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/StoreComparisonRequest']]],
                    ],
                    'responses' => [
                        '201' => [
                            'description' => 'Comparison saved',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/SavedComparison']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
            ],
            '/comparisons/{comparison}' => [
                'get' => [
                    'tags' => ['Saved Comparisons'],
                    'summary' => 'Get saved comparison',
                    'description' => 'Retrieves a single saved comparison with live matrix and product data.',
                    'operationId' => 'getComparisonById',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'comparison', 'in' => 'path', 'required' => true, 'description' => 'Comparison ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Comparison details',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/SavedComparison']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
                'patch' => [
                    'tags' => ['Saved Comparisons'],
                    'summary' => 'Update saved comparison',
                    'description' => 'Updates title, product selection, or AI verdict for a saved comparison.',
                    'operationId' => 'updateComparison',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'comparison', 'in' => 'path', 'required' => true, 'description' => 'Comparison ID', 'schema' => ['type' => 'integer']],
                    ],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/UpdateComparisonRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Comparison updated',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/SavedComparison']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
                'delete' => [
                    'tags' => ['Saved Comparisons'],
                    'summary' => 'Delete saved comparison',
                    'description' => 'Deletes an owned saved comparison.',
                    'operationId' => 'deleteComparison',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'comparison', 'in' => 'path', 'required' => true, 'description' => 'Comparison ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '204' => ['description' => 'Comparison deleted successfully'],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
            ],
            '/comparisons/{comparison}/share' => [
                'post' => [
                    'tags' => ['Saved Comparisons'],
                    'summary' => 'Mint public share link',
                    'description' => 'Generates or returns an existing shareable token and URL (idempotent).',
                    'operationId' => 'shareComparison',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'comparison', 'in' => 'path', 'required' => true, 'description' => 'Comparison ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Comparison share token',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['type' => 'object', 'properties' => ['share_token' => ['type' => 'string'], 'share_url' => ['type' => 'string']]]]]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
                'delete' => [
                    'tags' => ['Saved Comparisons'],
                    'summary' => 'Revoke public share link',
                    'description' => 'Revokes the public share link for a comparison.',
                    'operationId' => 'unshareComparison',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'comparison', 'in' => 'path', 'required' => true, 'description' => 'Comparison ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '204' => ['description' => 'Public share link revoked'],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
            ],
            '/shared/comparisons/{token}' => [
                'get' => [
                    'tags' => ['Saved Comparisons'],
                    'summary' => 'View shared comparison',
                    'description' => 'Public view of a comparison via its 32-character share token.',
                    'operationId' => 'getSharedComparison',
                    'parameters' => [
                        ['name' => 'token', 'in' => 'path', 'required' => true, 'description' => '32-character alphanumeric share token', 'schema' => ['type' => 'string']],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Shared comparison details',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/SavedComparison']], 'required' => ['data']]]],
                        ],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
            ],
            '/assistant/quota' => [
                'get' => [
                    'tags' => ['Assistant'],
                    'summary' => 'Get daily AI quota',
                    'description' => 'Returns daily limit, used count today, and remaining queries before UTC reset.',
                    'operationId' => 'getAssistantQuota',
                    'responses' => [
                        '200' => [
                            'description' => 'Daily AI quota metrics',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/AssistantQuota']], 'required' => ['data']]]],
                        ],
                    ],
                ],
            ],
            '/assistant/conversations' => [
                'get' => [
                    'tags' => ['Assistant'],
                    'summary' => 'List assistant conversations',
                    'description' => 'Lists conversations for the authenticated user or guest session.',
                    'operationId' => 'getAssistantConversations',
                    'security' => [[], ['cookieAuth' => [], 'sanctumCsrf' => []], ['sessionKeyAuth' => []]],
                    'responses' => [
                        '200' => [
                            'description' => 'Conversation thread summaries',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/AssistantConversation']]], 'required' => ['data']]]],
                        ],
                    ],
                ],
                'post' => [
                    'tags' => ['Assistant'],
                    'summary' => 'Start new assistant thread',
                    'description' => 'Creates a new empty conversation thread.',
                    'operationId' => 'storeAssistantConversation',
                    'security' => [[], ['cookieAuth' => [], 'sanctumCsrf' => []], ['sessionKeyAuth' => []]],
                    'requestBody' => [
                        'required' => false,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/StoreAssistantConversationRequest']]],
                    ],
                    'responses' => [
                        '201' => [
                            'description' => 'Conversation initialized',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/AssistantConversation']], 'required' => ['data']]]],
                        ],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
            ],
            '/assistant/conversations/{conversation}' => [
                'get' => [
                    'tags' => ['Assistant'],
                    'summary' => 'Get conversation messages',
                    'description' => 'Retrieves complete message exchange history for a conversation thread.',
                    'operationId' => 'getAssistantConversationById',
                    'security' => [[], ['cookieAuth' => [], 'sanctumCsrf' => []], ['sessionKeyAuth' => []]],
                    'parameters' => [
                        ['name' => 'conversation', 'in' => 'path', 'required' => true, 'description' => 'Conversation ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Conversation thread with messages',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['type' => 'object', 'properties' => ['id' => ['type' => 'integer'], 'title' => ['type' => 'string'], 'messages' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/AssistantMessage']]]]]]]],
                        ],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
                'delete' => [
                    'tags' => ['Assistant'],
                    'summary' => 'Delete conversation',
                    'description' => 'Deletes an owned assistant conversation thread.',
                    'operationId' => 'deleteAssistantConversation',
                    'security' => [[], ['cookieAuth' => [], 'sanctumCsrf' => []], ['sessionKeyAuth' => []]],
                    'parameters' => [
                        ['name' => 'conversation', 'in' => 'path', 'required' => true, 'description' => 'Conversation ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '204' => ['description' => 'Conversation deleted successfully'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
            ],
            '/assistant/conversations/{conversation}/messages' => [
                'post' => [
                    'tags' => ['Assistant'],
                    'summary' => 'Send shopping message',
                    'description' => 'Sends a prompt to the shopping assistant. Queries PostgreSQL for candidates, grounds recommendations, and returns ranked picks. Decrements daily quota on ok reply.',
                    'operationId' => 'storeAssistantMessage',
                    'security' => [[], ['cookieAuth' => [], 'sanctumCsrf' => []], ['sessionKeyAuth' => []]],
                    'parameters' => [
                        ['name' => 'conversation', 'in' => 'path', 'required' => true, 'description' => 'Conversation ID', 'schema' => ['type' => 'integer']],
                    ],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/StoreAssistantMessageRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Assistant response with grounded product recommendations',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/AssistantMessage']], 'required' => ['data']]]],
                        ],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                        '429' => [
                            'description' => 'Daily quota reached (HTTP 429 ai_quota_exceeded) or rate limit',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/ApiErrorResponse']]],
                        ],
                        '503' => [
                            'description' => 'Groq AI service temporarily unavailable',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/ApiErrorResponse']]],
                        ],
                    ],
                ],
            ],
            '/admin/dashboard' => [
                'get' => [
                    'tags' => ['Admin Dashboard'],
                    'summary' => 'Admin overview KPIs',
                    'description' => 'Aggregated catalog counts, user metrics, moderation queue status, AI telemetry, and recent audit activity.',
                    'operationId' => 'getAdminDashboard',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'responses' => [
                        '200' => [
                            'description' => 'Dashboard telemetry overview',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/AdminDashboard']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                    ],
                ],
            ],
            '/admin/ai/usage' => [
                'get' => [
                    'tags' => ['Admin AI Usage'],
                    'summary' => 'AI usage analytics',
                    'description' => 'Aggregated LLM telemetry, chronological timeseries, feature breakdown, top consumers, and paginated audit logs.',
                    'operationId' => 'getAdminAiUsage',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'start_date', 'in' => 'query', 'schema' => ['type' => 'string', 'format' => 'date']],
                        ['name' => 'end_date', 'in' => 'query', 'schema' => ['type' => 'string', 'format' => 'date']],
                        ['name' => 'feature', 'in' => 'query', 'schema' => ['type' => 'string', 'enum' => ['assistant', 'compare', 'review_summary']]],
                        ['name' => 'status', 'in' => 'query', 'schema' => ['type' => 'string', 'enum' => ['success', 'error', 'rate_limited']]],
                        ['name' => 'page', 'in' => 'query', 'schema' => ['type' => 'integer', 'default' => 1]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'AI analytics metrics',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/AdminAiUsage']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                    ],
                ],
            ],
            '/admin/activity-logs' => [
                'get' => [
                    'tags' => ['Admin Activity Logs'],
                    'summary' => 'List admin activity logs',
                    'description' => 'Immutable audit log entries detailing administrative actions with attribute before/after diffs.',
                    'operationId' => 'getAdminActivityLogs',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'admin_id', 'in' => 'query', 'schema' => ['type' => 'integer']],
                        ['name' => 'action', 'in' => 'query', 'schema' => ['type' => 'string']],
                        ['name' => 'subject_type', 'in' => 'query', 'schema' => ['type' => 'string']],
                        ['name' => 'start_date', 'in' => 'query', 'schema' => ['type' => 'string', 'format' => 'date']],
                        ['name' => 'end_date', 'in' => 'query', 'schema' => ['type' => 'string', 'format' => 'date']],
                        ['name' => 'q', 'in' => 'query', 'schema' => ['type' => 'string']],
                        ['name' => 'page', 'in' => 'query', 'schema' => ['type' => 'integer', 'default' => 1]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Paginated activity log records',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/PaginatedActivityLogsResponse']]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                    ],
                ],
            ],
            '/admin/categories' => [
                'get' => [
                    'tags' => ['Admin Categories'],
                    'summary' => 'List categories (admin)',
                    'description' => 'Lists all categories with parent hierarchies and specification definitions.',
                    'operationId' => 'adminGetCategories',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'responses' => [
                        '200' => [
                            'description' => 'Categories collection',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/CategoryNode']]], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                    ],
                ],
                'post' => [
                    'tags' => ['Admin Categories'],
                    'summary' => 'Create category',
                    'description' => 'Creates a new product category. Logged to audit trail.',
                    'operationId' => 'adminStoreCategory',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/StoreCategoryRequest']]],
                    ],
                    'responses' => [
                        '201' => [
                            'description' => 'Category created',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/CategoryNode']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
            ],
            '/admin/categories/{category}' => [
                'get' => [
                    'tags' => ['Admin Categories'],
                    'summary' => 'Get category details',
                    'description' => 'Retrieves category details, parent, and associated spec definitions.',
                    'operationId' => 'adminGetCategoryById',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'category', 'in' => 'path', 'required' => true, 'description' => 'Category ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Category details',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/CategoryNode']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
                'put' => [
                    'tags' => ['Admin Categories'],
                    'summary' => 'Update category',
                    'description' => 'Updates category name, description, icon, or parent hierarchy. Enforces loop prevention.',
                    'operationId' => 'adminUpdateCategory',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'category', 'in' => 'path', 'required' => true, 'description' => 'Category ID', 'schema' => ['type' => 'integer']],
                    ],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/UpdateCategoryRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Category updated',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/CategoryNode']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
                'patch' => [
                    'tags' => ['Admin Categories'],
                    'summary' => 'Partially update category',
                    'description' => 'Partially updates category properties.',
                    'operationId' => 'adminPatchCategory',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'category', 'in' => 'path', 'required' => true, 'description' => 'Category ID', 'schema' => ['type' => 'integer']],
                    ],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/UpdateCategoryRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Category updated',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/CategoryNode']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
                'delete' => [
                    'tags' => ['Admin Categories'],
                    'summary' => 'Delete category',
                    'description' => 'Deletes an empty category. Blocked with 422 if products are assigned.',
                    'operationId' => 'adminDeleteCategory',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'category', 'in' => 'path', 'required' => true, 'description' => 'Category ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '204' => ['description' => 'Category deleted'],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
            ],
            '/admin/categories/{category}/specs' => [
                'get' => [
                    'tags' => ['Admin Categories'],
                    'summary' => 'List category spec definitions',
                    'description' => 'Lists all specification attributes defined for a category.',
                    'operationId' => 'adminGetCategorySpecs',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'category', 'in' => 'path', 'required' => true, 'description' => 'Category ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Spec definitions collection',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/SpecDefinition']]], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
                'post' => [
                    'tags' => ['Admin Categories'],
                    'summary' => 'Create category spec definition',
                    'description' => 'Adds a typed specification definition to a category.',
                    'operationId' => 'adminStoreCategorySpec',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'category', 'in' => 'path', 'required' => true, 'description' => 'Category ID', 'schema' => ['type' => 'integer']],
                    ],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/StoreSpecDefinitionRequest']]],
                    ],
                    'responses' => [
                        '201' => [
                            'description' => 'Spec definition created',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/SpecDefinition']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
            ],
            '/admin/categories/{category}/specs/{spec}' => [
                'get' => [
                    'tags' => ['Admin Categories'],
                    'summary' => 'Get spec definition',
                    'description' => 'Retrieves a single category specification definition.',
                    'operationId' => 'adminGetCategorySpecById',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'category', 'in' => 'path', 'required' => true, 'description' => 'Category ID', 'schema' => ['type' => 'integer']],
                        ['name' => 'spec', 'in' => 'path', 'required' => true, 'description' => 'Spec Definition ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Spec definition details',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/SpecDefinition']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
                'put' => [
                    'tags' => ['Admin Categories'],
                    'summary' => 'Update spec definition',
                    'description' => 'Updates spec definition label, filterability, comparability, and display order.',
                    'operationId' => 'adminUpdateCategorySpec',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'category', 'in' => 'path', 'required' => true, 'description' => 'Category ID', 'schema' => ['type' => 'integer']],
                        ['name' => 'spec', 'in' => 'path', 'required' => true, 'description' => 'Spec Definition ID', 'schema' => ['type' => 'integer']],
                    ],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/UpdateSpecDefinitionRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Spec definition updated',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/SpecDefinition']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
                'patch' => [
                    'tags' => ['Admin Categories'],
                    'summary' => 'Partially update spec definition',
                    'description' => 'Partially updates spec definition properties.',
                    'operationId' => 'adminPatchCategorySpec',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'category', 'in' => 'path', 'required' => true, 'description' => 'Category ID', 'schema' => ['type' => 'integer']],
                        ['name' => 'spec', 'in' => 'path', 'required' => true, 'description' => 'Spec Definition ID', 'schema' => ['type' => 'integer']],
                    ],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/UpdateSpecDefinitionRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Spec definition updated',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/SpecDefinition']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
                'delete' => [
                    'tags' => ['Admin Categories'],
                    'summary' => 'Delete spec definition',
                    'description' => 'Deletes a specification definition from a category.',
                    'operationId' => 'adminDeleteCategorySpec',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'category', 'in' => 'path', 'required' => true, 'description' => 'Category ID', 'schema' => ['type' => 'integer']],
                        ['name' => 'spec', 'in' => 'path', 'required' => true, 'description' => 'Spec Definition ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '204' => ['description' => 'Spec definition deleted'],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
            ],
            '/admin/brands' => [
                'get' => [
                    'tags' => ['Admin Brands'],
                    'summary' => 'List brands',
                    'description' => 'Retrieves all catalog brands with product counts.',
                    'operationId' => 'adminGetBrands',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'responses' => [
                        '200' => [
                            'description' => 'Brands collection',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/Brand']]], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                    ],
                ],
                'post' => [
                    'tags' => ['Admin Brands'],
                    'summary' => 'Create brand',
                    'description' => 'Creates a new brand. Logged to audit trail.',
                    'operationId' => 'adminStoreBrand',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/StoreBrandRequest']]],
                    ],
                    'responses' => [
                        '201' => [
                            'description' => 'Brand created',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/Brand']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
            ],
            '/admin/brands/{brand}' => [
                'get' => [
                    'tags' => ['Admin Brands'],
                    'summary' => 'Get brand details',
                    'description' => 'Retrieves brand details and products count.',
                    'operationId' => 'adminGetBrandById',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'brand', 'in' => 'path', 'required' => true, 'description' => 'Brand ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Brand details',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/Brand']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
                'put' => [
                    'tags' => ['Admin Brands'],
                    'summary' => 'Update brand',
                    'description' => 'Updates brand name, slug, or website.',
                    'operationId' => 'adminUpdateBrand',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'brand', 'in' => 'path', 'required' => true, 'description' => 'Brand ID', 'schema' => ['type' => 'integer']],
                    ],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/UpdateBrandRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Brand updated',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/Brand']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
                'patch' => [
                    'tags' => ['Admin Brands'],
                    'summary' => 'Partially update brand',
                    'description' => 'Partially updates brand attributes.',
                    'operationId' => 'adminPatchBrand',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'brand', 'in' => 'path', 'required' => true, 'description' => 'Brand ID', 'schema' => ['type' => 'integer']],
                    ],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/UpdateBrandRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Brand updated',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/Brand']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
                'delete' => [
                    'tags' => ['Admin Brands'],
                    'summary' => 'Delete brand',
                    'description' => 'Deletes an empty brand. Blocked with 422 if products are assigned.',
                    'operationId' => 'adminDeleteBrand',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'brand', 'in' => 'path', 'required' => true, 'description' => 'Brand ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '204' => ['description' => 'Brand deleted'],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
            ],
            '/admin/products' => [
                'get' => [
                    'tags' => ['Admin Products'],
                    'summary' => 'List products (admin)',
                    'description' => 'Paginated product listing with publication status, draft visibility, and soft-delete filters.',
                    'operationId' => 'adminGetProducts',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'q', 'in' => 'query', 'schema' => ['type' => 'string']],
                        ['name' => 'category', 'in' => 'query', 'schema' => ['type' => 'string']],
                        ['name' => 'brand', 'in' => 'query', 'schema' => ['type' => 'string']],
                        ['name' => 'status', 'in' => 'query', 'schema' => ['type' => 'string', 'enum' => ['published', 'draft', 'trashed']]],
                        ['name' => 'page', 'in' => 'query', 'schema' => ['type' => 'integer', 'default' => 1]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Paginated products collection',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/PaginatedProductsResponse']]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                    ],
                ],
                'post' => [
                    'tags' => ['Admin Products'],
                    'summary' => 'Create product',
                    'description' => 'Creates a new product with typed category specs and initial price history entry.',
                    'operationId' => 'adminStoreProduct',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/StoreProductRequest']]],
                    ],
                    'responses' => [
                        '201' => [
                            'description' => 'Product created',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/ProductDetail']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
            ],
            '/admin/products/bulk-status' => [
                'patch' => [
                    'tags' => ['Admin Products'],
                    'summary' => 'Bulk update product publication status',
                    'description' => 'Publishes or unpublishes multiple products in a single operation. Invalidates facet caches.',
                    'operationId' => 'adminBulkProductStatus',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/BulkProductStatusRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Bulk status applied',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['type' => 'object', 'properties' => ['updated_count' => ['type' => 'integer']]]]]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
            ],
            '/admin/products/{product}' => [
                'get' => [
                    'tags' => ['Admin Products'],
                    'summary' => 'Get product details (admin)',
                    'description' => 'Retrieves complete product specification, including drafts and soft-deleted records.',
                    'operationId' => 'adminGetProductById',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'product', 'in' => 'path', 'required' => true, 'description' => 'Product ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Product details',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/ProductDetail']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
                'put' => [
                    'tags' => ['Admin Products'],
                    'summary' => 'Update product',
                    'description' => 'Updates product details, specs, and price. Records price changes in price_history and recalculates Value Score.',
                    'operationId' => 'adminUpdateProduct',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'product', 'in' => 'path', 'required' => true, 'description' => 'Product ID', 'schema' => ['type' => 'integer']],
                    ],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/UpdateProductRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Product updated',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/ProductDetail']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
                'patch' => [
                    'tags' => ['Admin Products'],
                    'summary' => 'Partially update product',
                    'description' => 'Partially updates product fields.',
                    'operationId' => 'adminPatchProduct',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'product', 'in' => 'path', 'required' => true, 'description' => 'Product ID', 'schema' => ['type' => 'integer']],
                    ],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/UpdateProductRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Product updated',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/ProductDetail']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
                'delete' => [
                    'tags' => ['Admin Products'],
                    'summary' => 'Delete product',
                    'description' => 'Soft-deletes a product, hides it from public discovery, and recalculates category Value Scores.',
                    'operationId' => 'adminDeleteProduct',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'product', 'in' => 'path', 'required' => true, 'description' => 'Product ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '204' => ['description' => 'Product deleted successfully'],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
            ],
            '/admin/products/{product}/images' => [
                'get' => [
                    'tags' => ['Admin Products'],
                    'summary' => 'List product images',
                    'description' => 'Retrieves all gallery images for a product.',
                    'operationId' => 'adminGetProductImages',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'product', 'in' => 'path', 'required' => true, 'description' => 'Product ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Product images collection',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/ProductImage']]], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
                'post' => [
                    'tags' => ['Admin Products'],
                    'summary' => 'Upload product image',
                    'description' => 'Uploads a JPEG/PNG/WebP image (max 5 MB). The first image is auto-promoted to primary.',
                    'operationId' => 'adminStoreProductImage',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'product', 'in' => 'path', 'required' => true, 'description' => 'Product ID', 'schema' => ['type' => 'integer']],
                    ],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['multipart/form-data' => ['schema' => ['$ref' => '#/components/schemas/StoreProductImageRequest']]],
                    ],
                    'responses' => [
                        '201' => [
                            'description' => 'Image uploaded and processed',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/ProductImage']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
            ],
            '/admin/products/{product}/images/reorder' => [
                'patch' => [
                    'tags' => ['Admin Products'],
                    'summary' => 'Reorder product images',
                    'description' => 'Reorders the gallery sort order sequence for a product.',
                    'operationId' => 'adminReorderProductImages',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'product', 'in' => 'path', 'required' => true, 'description' => 'Product ID', 'schema' => ['type' => 'integer']],
                    ],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/ReorderProductImagesRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Image sort orders updated',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/ProductImage']]], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
            ],
            '/admin/products/{product}/images/{image}' => [
                'put' => [
                    'tags' => ['Admin Products'],
                    'summary' => 'Update product image metadata',
                    'description' => 'Updates alt text and primary status for an image.',
                    'operationId' => 'adminUpdateProductImage',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'product', 'in' => 'path', 'required' => true, 'description' => 'Product ID', 'schema' => ['type' => 'integer']],
                        ['name' => 'image', 'in' => 'path', 'required' => true, 'description' => 'Image ID', 'schema' => ['type' => 'integer']],
                    ],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/UpdateProductImageRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Image updated',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/ProductImage']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
                'patch' => [
                    'tags' => ['Admin Products'],
                    'summary' => 'Partially update product image metadata',
                    'description' => 'Partially updates image metadata.',
                    'operationId' => 'adminPatchProductImage',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'product', 'in' => 'path', 'required' => true, 'description' => 'Product ID', 'schema' => ['type' => 'integer']],
                        ['name' => 'image', 'in' => 'path', 'required' => true, 'description' => 'Image ID', 'schema' => ['type' => 'integer']],
                    ],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/UpdateProductImageRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Image updated',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/ProductImage']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
                'delete' => [
                    'tags' => ['Admin Products'],
                    'summary' => 'Delete product image',
                    'description' => 'Deletes image storage file and promotes next available image to primary if needed.',
                    'operationId' => 'adminDeleteProductImage',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'product', 'in' => 'path', 'required' => true, 'description' => 'Product ID', 'schema' => ['type' => 'integer']],
                        ['name' => 'image', 'in' => 'path', 'required' => true, 'description' => 'Image ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '204' => ['description' => 'Image deleted successfully'],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
            ],
            '/admin/products/{product}/regenerate-summary' => [
                'post' => [
                    'tags' => ['Admin Products'],
                    'summary' => 'Regenerate AI review summary',
                    'description' => 'Manually triggers asynchronous background job to regenerate the AI review summary from approved reviews.',
                    'operationId' => 'adminRegenerateProductSummary',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'product', 'in' => 'path', 'required' => true, 'description' => 'Product ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '202' => [
                            'description' => 'Summary generation job dispatched',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['type' => 'object', 'properties' => ['message' => ['type' => 'string']]]]]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
            ],
            '/admin/users' => [
                'get' => [
                    'tags' => ['Admin Users'],
                    'summary' => 'List users',
                    'description' => 'Lists user accounts with role, activation status, and review counts.',
                    'operationId' => 'adminGetUsers',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'q', 'in' => 'query', 'schema' => ['type' => 'string']],
                        ['name' => 'role', 'in' => 'query', 'schema' => ['type' => 'string', 'enum' => ['customer', 'admin']]],
                        ['name' => 'status', 'in' => 'query', 'schema' => ['type' => 'string', 'enum' => ['active', 'inactive']]],
                        ['name' => 'page', 'in' => 'query', 'schema' => ['type' => 'integer', 'default' => 1]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Paginated users collection',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/PaginatedUsersResponse']]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                    ],
                ],
            ],
            '/admin/users/{user}' => [
                'patch' => [
                    'tags' => ['Admin Users'],
                    'summary' => 'Update user status or role',
                    'description' => 'Activates/deactivates accounts or modifies roles. Enforces self-protection and last-admin preservation guards.',
                    'operationId' => 'adminUpdateUser',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'user', 'in' => 'path', 'required' => true, 'description' => 'User ID', 'schema' => ['type' => 'integer']],
                    ],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/UpdateUserRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'User updated',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/User']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
            ],
            '/admin/reviews' => [
                'get' => [
                    'tags' => ['Admin Reviews'],
                    'summary' => 'List reviews for moderation',
                    'description' => 'Lists reviews filtered by moderation status (pending, approved, rejected).',
                    'operationId' => 'adminGetReviews',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'status', 'in' => 'query', 'schema' => ['type' => 'string', 'enum' => ['pending', 'approved', 'rejected'], 'default' => 'pending']],
                        ['name' => 'rating', 'in' => 'query', 'schema' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 5]],
                        ['name' => 'q', 'in' => 'query', 'schema' => ['type' => 'string']],
                        ['name' => 'page', 'in' => 'query', 'schema' => ['type' => 'integer', 'default' => 1]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Paginated reviews moderation queue',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/PaginatedReviewsResponse']]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                    ],
                ],
            ],
            '/admin/reviews/bulk-status' => [
                'patch' => [
                    'tags' => ['Admin Reviews'],
                    'summary' => 'Bulk moderate reviews',
                    'description' => 'Approves or rejects multiple reviews in bulk with optional rejection reason.',
                    'operationId' => 'adminBulkReviewStatus',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/BulkReviewStatusRequest']]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Reviews moderated in bulk',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['type' => 'object', 'properties' => ['updated_count' => ['type' => 'integer']]]]]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
            ],
            '/admin/reviews/{review}' => [
                'patch' => [
                    'tags' => ['Admin Reviews'],
                    'summary' => 'Moderate single review',
                    'description' => 'Approves or rejects a customer review. Updates product ratings and triggers AI summary refresh.',
                    'operationId' => 'adminUpdateReview',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'review', 'in' => 'path', 'required' => true, 'description' => 'Review ID', 'schema' => ['type' => 'integer']],
                    ],
                    'requestBody' => [
                        'required' => true,
                        'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['status' => ['type' => 'string', 'enum' => ['approved', 'rejected']], 'rejection_reason' => ['type' => 'string']], 'required' => ['status']]]],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Review moderated',
                            'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/Review']], 'required' => ['data']]]],
                        ],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                        '422' => ['$ref' => '#/components/responses/ValidationError'],
                    ],
                ],
                'delete' => [
                    'tags' => ['Admin Reviews'],
                    'summary' => 'Delete review (admin)',
                    'description' => 'Permanently deletes a review and updates product aggregates.',
                    'operationId' => 'adminDeleteReview',
                    'security' => [['cookieAuth' => [], 'sanctumCsrf' => []]],
                    'parameters' => [
                        ['name' => 'review', 'in' => 'path', 'required' => true, 'description' => 'Review ID', 'schema' => ['type' => 'integer']],
                    ],
                    'responses' => [
                        '204' => ['description' => 'Review deleted'],
                        '401' => ['$ref' => '#/components/responses/UnauthorizedError'],
                        '403' => ['$ref' => '#/components/responses/ForbiddenError'],
                        '404' => ['$ref' => '#/components/responses/NotFoundError'],
                    ],
                ],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function buildSchemas(): array
    {
        return [
            'Money' => [
                'type' => 'object',
                'properties' => [
                    'amount' => ['type' => 'string', 'example' => '89999.00', 'description' => 'Decimal string formatted to two decimal places'],
                    'currency' => ['type' => 'string', 'example' => 'INR', 'description' => 'Three-letter ISO 4217 currency code'],
                ],
                'required' => ['amount', 'currency'],
            ],
            'ApiMeta' => [
                'type' => 'object',
                'properties' => [
                    'current_page' => ['type' => 'integer', 'example' => 1],
                    'per_page' => ['type' => 'integer', 'example' => 24],
                    'total' => ['type' => 'integer', 'example' => 120],
                    'last_page' => ['type' => 'integer', 'example' => 5],
                ],
                'required' => ['current_page', 'per_page', 'total', 'last_page'],
            ],
            'ApiLinks' => [
                'type' => 'object',
                'properties' => [
                    'first' => ['type' => ['string', 'null'], 'example' => 'http://localhost:8080/api/v1/products?page=1'],
                    'last' => ['type' => ['string', 'null'], 'example' => 'http://localhost:8080/api/v1/products?page=5'],
                    'prev' => ['type' => ['string', 'null'], 'example' => null],
                    'next' => ['type' => ['string', 'null'], 'example' => 'http://localhost:8080/api/v1/products?page=2'],
                ],
            ],
            'ApiErrorDetail' => [
                'type' => 'object',
                'properties' => [
                    'code' => ['type' => 'string', 'example' => 'validation_failed'],
                    'message' => ['type' => 'string', 'example' => 'The given data was invalid.'],
                    'details' => ['type' => 'object', 'additionalProperties' => true, 'example' => ['email' => ['The email has already been taken.']]],
                    'request_id' => ['type' => 'string', 'example' => 'req_01j7abc123xyz'],
                ],
                'required' => ['code', 'message', 'request_id'],
            ],
            'ApiErrorResponse' => [
                'type' => 'object',
                'properties' => [
                    'error' => ['$ref' => '#/components/schemas/ApiErrorDetail'],
                ],
                'required' => ['error'],
            ],
            'ValidationErrorResponse' => [
                'type' => 'object',
                'properties' => [
                    'error' => [
                        'type' => 'object',
                        'properties' => [
                            'code' => ['type' => 'string', 'example' => 'validation_failed'],
                            'message' => ['type' => 'string', 'example' => 'The given data was invalid.'],
                            'details' => ['type' => 'object', 'additionalProperties' => ['type' => 'array', 'items' => ['type' => 'string']]],
                            'request_id' => ['type' => 'string', 'example' => 'req_01j7abc123xyz'],
                        ],
                        'required' => ['code', 'message', 'details', 'request_id'],
                    ],
                ],
                'required' => ['error'],
            ],
            'HealthResponse' => [
                'type' => 'object',
                'properties' => [
                    'data' => [
                        'type' => 'object',
                        'properties' => [
                            'status' => ['type' => 'string', 'example' => 'ok'],
                            'timestamp' => ['type' => 'string', 'format' => 'date-time', 'example' => '2026-11-19T09:30:00Z'],
                            'services' => [
                                'type' => 'object',
                                'properties' => [
                                    'database' => ['type' => 'string', 'example' => 'ok'],
                                    'redis' => ['type' => 'string', 'example' => 'ok'],
                                ],
                                'required' => ['database', 'redis'],
                            ],
                        ],
                        'required' => ['status', 'timestamp', 'services'],
                    ],
                ],
                'required' => ['data'],
            ],
            'UserPreferences' => [
                'type' => 'object',
                'properties' => [
                    'default_budget_max' => ['type' => ['number', 'null'], 'example' => 90000],
                    'favorite_categories' => ['type' => 'array', 'items' => ['type' => 'string'], 'example' => ['laptops', 'smartphones']],
                    'prioritized_specs' => ['type' => 'array', 'items' => ['type' => 'string'], 'example' => ['ram_gb', 'battery_mah']],
                ],
                'required' => ['default_budget_max', 'favorite_categories', 'prioritized_specs'],
            ],
            'User' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer', 'example' => 1],
                    'name' => ['type' => 'string', 'example' => 'Priya Sharma'],
                    'email' => ['type' => 'string', 'format' => 'email', 'example' => 'priya@example.com'],
                    'role' => ['type' => 'string', 'enum' => ['customer', 'admin'], 'example' => 'customer'],
                    'is_active' => ['type' => 'boolean', 'example' => true],
                    'preferences' => ['$ref' => '#/components/schemas/UserPreferences'],
                    'created_at' => ['type' => 'string', 'format' => 'date-time', 'example' => '2026-11-01T10:00:00Z'],
                    'updated_at' => ['type' => 'string', 'format' => 'date-time', 'example' => '2026-11-15T12:30:00Z'],
                ],
                'required' => ['id', 'name', 'email', 'role', 'is_active', 'preferences'],
            ],
            'SingleUserResponse' => [
                'type' => 'object',
                'properties' => [
                    'data' => ['$ref' => '#/components/schemas/User'],
                ],
                'required' => ['data'],
            ],
            'CategoryNode' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer', 'example' => 1],
                    'name' => ['type' => 'string', 'example' => 'Electronics'],
                    'slug' => ['type' => 'string', 'example' => 'electronics'],
                    'description' => ['type' => ['string', 'null'], 'example' => 'Consumer electronics and computing devices'],
                    'icon' => ['type' => ['string', 'null'], 'example' => 'laptop'],
                    'parent_id' => ['type' => ['integer', 'null'], 'example' => null],
                    'products_count' => ['type' => 'integer', 'example' => 45],
                    'children' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/CategoryNode']],
                ],
                'required' => ['id', 'name', 'slug', 'parent_id', 'products_count'],
            ],
            'CategoryFilterFacets' => [
                'type' => 'object',
                'properties' => [
                    'category' => [
                        'type' => 'object',
                        'properties' => [
                            'id' => ['type' => 'integer', 'example' => 5],
                            'name' => ['type' => 'string', 'example' => 'Laptops'],
                            'slug' => ['type' => 'string', 'example' => 'laptops'],
                        ],
                        'required' => ['id', 'name', 'slug'],
                    ],
                    'price_range' => [
                        'type' => 'object',
                        'properties' => [
                            'min' => ['type' => 'number', 'example' => 24999],
                            'max' => ['type' => 'number', 'example' => 149999],
                            'currency' => ['type' => 'string', 'example' => 'INR'],
                        ],
                        'required' => ['min', 'max', 'currency'],
                    ],
                    'brands' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'id' => ['type' => 'integer', 'example' => 4],
                                'name' => ['type' => 'string', 'example' => 'Lenovo'],
                                'slug' => ['type' => 'string', 'example' => 'lenovo'],
                                'count' => ['type' => 'integer', 'example' => 8],
                            ],
                            'required' => ['id', 'name', 'slug', 'count'],
                        ],
                    ],
                    'specs' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'key' => ['type' => 'string', 'example' => 'ram_gb'],
                                'label' => ['type' => 'string', 'example' => 'RAM'],
                                'data_type' => ['type' => 'string', 'enum' => ['number', 'boolean', 'text'], 'example' => 'number'],
                                'unit' => ['type' => ['string', 'null'], 'example' => 'GB'],
                                'filter_type' => ['type' => 'string', 'enum' => ['range', 'boolean', 'select'], 'example' => 'select'],
                                'options' => ['type' => 'array', 'items' => ['type' => 'string'], 'example' => ['8', '16', '32']],
                                'min' => ['type' => 'number', 'example' => 8],
                                'max' => ['type' => 'number', 'example' => 64],
                            ],
                            'required' => ['key', 'label', 'data_type', 'filter_type'],
                        ],
                    ],
                ],
                'required' => ['category', 'price_range', 'brands', 'specs'],
            ],
            'Brand' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer', 'example' => 4],
                    'name' => ['type' => 'string', 'example' => 'Lenovo'],
                    'slug' => ['type' => 'string', 'example' => 'lenovo'],
                    'website' => ['type' => ['string', 'null'], 'example' => 'https://www.lenovo.com'],
                    'products_count' => ['type' => 'integer', 'example' => 12],
                ],
                'required' => ['id', 'name', 'slug'],
            ],
            'SpecDefinition' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer', 'example' => 20],
                    'category_id' => ['type' => 'integer', 'example' => 5],
                    'name' => ['type' => 'string', 'example' => 'RAM'],
                    'key' => ['type' => 'string', 'example' => 'ram_gb'],
                    'data_type' => ['type' => 'string', 'enum' => ['number', 'boolean', 'text'], 'example' => 'number'],
                    'unit' => ['type' => ['string', 'null'], 'example' => 'GB'],
                    'is_filterable' => ['type' => 'boolean', 'example' => true],
                    'is_comparable' => ['type' => 'boolean', 'example' => true],
                    'higher_is_better' => ['type' => ['boolean', 'null'], 'example' => true],
                    'filter_type' => ['type' => 'string', 'enum' => ['range', 'boolean', 'select'], 'example' => 'select'],
                    'sort_order' => ['type' => 'integer', 'example' => 1],
                    'options' => ['type' => 'array', 'items' => ['type' => 'string'], 'example' => ['8', '16', '32', '64']],
                ],
                'required' => ['id', 'category_id', 'name', 'key', 'data_type', 'is_filterable', 'is_comparable'],
            ],
            'ProductImage' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer', 'example' => 101],
                    'url' => ['type' => 'string', 'example' => 'http://localhost:8080/storage/products/yoga-slim.webp'],
                    'alt_text' => ['type' => 'string', 'example' => 'Lenovo Yoga Slim 7 Pro angled view'],
                    'is_primary' => ['type' => 'boolean', 'example' => true],
                    'sort_order' => ['type' => 'integer', 'example' => 0],
                ],
                'required' => ['id', 'url', 'alt_text', 'is_primary', 'sort_order'],
            ],
            'ProductSpec' => [
                'type' => 'object',
                'properties' => [
                    'key' => ['type' => 'string', 'example' => 'ram_gb'],
                    'label' => ['type' => 'string', 'example' => 'RAM'],
                    'value' => [
                        'oneOf' => [
                            ['type' => 'string'],
                            ['type' => 'number'],
                            ['type' => 'boolean'],
                        ],
                        'example' => 16,
                    ],
                    'unit' => ['type' => ['string', 'null'], 'example' => 'GB'],
                    'data_type' => ['type' => 'string', 'enum' => ['number', 'boolean', 'text'], 'example' => 'number'],
                    'is_comparable' => ['type' => 'boolean', 'example' => true],
                ],
                'required' => ['key', 'label', 'value', 'data_type', 'is_comparable'],
            ],
            'ProductCard' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer', 'example' => 14],
                    'name' => ['type' => 'string', 'example' => 'Lenovo Yoga Slim 7 Pro'],
                    'slug' => ['type' => 'string', 'example' => 'lenovo-yoga-slim-7-pro'],
                    'brand' => [
                        'type' => 'object',
                        'properties' => [
                            'id' => ['type' => 'integer', 'example' => 4],
                            'name' => ['type' => 'string', 'example' => 'Lenovo'],
                            'slug' => ['type' => 'string', 'example' => 'lenovo'],
                        ],
                        'required' => ['id', 'name', 'slug'],
                    ],
                    'category' => [
                        'type' => 'object',
                        'properties' => [
                            'id' => ['type' => 'integer', 'example' => 5],
                            'name' => ['type' => 'string', 'example' => 'Laptops'],
                            'slug' => ['type' => 'string', 'example' => 'laptops'],
                        ],
                        'required' => ['id', 'name', 'slug'],
                    ],
                    'price' => ['$ref' => '#/components/schemas/Money'],
                    'original_price' => [
                        'oneOf' => [
                            ['$ref' => '#/components/schemas/Money'],
                            ['type' => 'null'],
                        ],
                    ],
                    'is_available' => ['type' => 'boolean', 'example' => true],
                    'stock_count' => ['type' => 'integer', 'example' => 25],
                    'rating_avg' => ['type' => 'number', 'example' => 4.6],
                    'rating_count' => ['type' => 'integer', 'example' => 18],
                    'value_score' => ['type' => 'number', 'example' => 8.7],
                    'primary_image' => [
                        'oneOf' => [
                            ['$ref' => '#/components/schemas/ProductImage'],
                            ['type' => 'null'],
                        ],
                    ],
                ],
                'required' => ['id', 'name', 'slug', 'brand', 'category', 'price', 'is_available', 'stock_count', 'rating_avg', 'rating_count', 'value_score'],
            ],
            'ProductDetail' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer', 'example' => 14],
                    'name' => ['type' => 'string', 'example' => 'Lenovo Yoga Slim 7 Pro'],
                    'slug' => ['type' => 'string', 'example' => 'lenovo-yoga-slim-7-pro'],
                    'brand' => [
                        'type' => 'object',
                        'properties' => [
                            'id' => ['type' => 'integer', 'example' => 4],
                            'name' => ['type' => 'string', 'example' => 'Lenovo'],
                            'slug' => ['type' => 'string', 'example' => 'lenovo'],
                        ],
                        'required' => ['id', 'name', 'slug'],
                    ],
                    'category' => [
                        'type' => 'object',
                        'properties' => [
                            'id' => ['type' => 'integer', 'example' => 5],
                            'name' => ['type' => 'string', 'example' => 'Laptops'],
                            'slug' => ['type' => 'string', 'example' => 'laptops'],
                        ],
                        'required' => ['id', 'name', 'slug'],
                    ],
                    'price' => ['$ref' => '#/components/schemas/Money'],
                    'original_price' => [
                        'oneOf' => [
                            ['$ref' => '#/components/schemas/Money'],
                            ['type' => 'null'],
                        ],
                    ],
                    'is_available' => ['type' => 'boolean', 'example' => true],
                    'stock_count' => ['type' => 'integer', 'example' => 25],
                    'rating_avg' => ['type' => 'number', 'example' => 4.6],
                    'rating_count' => ['type' => 'integer', 'example' => 18],
                    'value_score' => ['type' => 'number', 'example' => 8.7],
                    'description' => ['type' => 'string', 'example' => 'Premium ultrabook engineered for mobile professionals.'],
                    'store_url' => ['type' => 'string', 'format' => 'uri', 'example' => 'https://store.lenovo.com/in/en/yoga-slim-7-pro'],
                    'specs' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/ProductSpec']],
                    'images' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/ProductImage']],
                    'primary_image' => [
                        'oneOf' => [
                            ['$ref' => '#/components/schemas/ProductImage'],
                            ['type' => 'null'],
                        ],
                    ],
                    'review_summary' => [
                        'oneOf' => [
                            ['$ref' => '#/components/schemas/ReviewSummary'],
                            ['type' => 'null'],
                        ],
                    ],
                ],
                'required' => ['id', 'name', 'slug', 'brand', 'category', 'price', 'is_available', 'stock_count', 'rating_avg', 'rating_count', 'value_score', 'description', 'store_url', 'specs', 'images'],
            ],
            'PaginatedProductsResponse' => [
                'type' => 'object',
                'properties' => [
                    'data' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/ProductCard']],
                    'meta' => ['$ref' => '#/components/schemas/ApiMeta'],
                    'links' => ['$ref' => '#/components/schemas/ApiLinks'],
                ],
                'required' => ['data', 'meta', 'links'],
            ],
            'PriceHistory' => [
                'type' => 'object',
                'properties' => [
                    'currency' => ['type' => 'string', 'example' => 'INR'],
                    'points' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'recorded_at' => ['type' => 'string', 'format' => 'date', 'example' => '2026-07-01'],
                                'price' => ['$ref' => '#/components/schemas/Money'],
                            ],
                            'required' => ['recorded_at', 'price'],
                        ],
                    ],
                ],
                'required' => ['currency', 'points'],
            ],
            'Review' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer', 'example' => 32],
                    'user' => [
                        'type' => 'object',
                        'properties' => [
                            'id' => ['type' => 'integer', 'example' => 14],
                            'name' => ['type' => 'string', 'example' => 'Amit Verma'],
                        ],
                        'required' => ['id', 'name'],
                    ],
                    'rating' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 5, 'example' => 5],
                    'title' => ['type' => 'string', 'example' => 'Brilliant OLED display and snappy performance'],
                    'body' => ['type' => 'string', 'example' => 'Compiles code instantly and screen colors are extremely crisp.'],
                    'status' => ['type' => 'string', 'enum' => ['pending', 'approved', 'rejected'], 'example' => 'approved'],
                    'rejection_reason' => ['type' => ['string', 'null'], 'example' => null],
                    'created_at' => ['type' => 'string', 'format' => 'date-time', 'example' => '2026-11-10T14:20:00Z'],
                    'updated_at' => ['type' => 'string', 'format' => 'date-time', 'example' => '2026-11-10T14:20:00Z'],
                ],
                'required' => ['id', 'user', 'rating', 'title', 'body', 'status', 'created_at'],
            ],
            'PaginatedReviewsResponse' => [
                'type' => 'object',
                'properties' => [
                    'data' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/Review']],
                    'meta' => ['$ref' => '#/components/schemas/ApiMeta'],
                    'links' => ['$ref' => '#/components/schemas/ApiLinks'],
                ],
                'required' => ['data', 'meta', 'links'],
            ],
            'ReviewSummary' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer', 'example' => 5],
                    'pros' => ['type' => 'array', 'items' => ['type' => 'string'], 'example' => ['Vibrant 2.8K 90Hz OLED display', 'Fast compilation and multitasking with Ryzen 7']],
                    'cons' => ['type' => 'array', 'items' => ['type' => 'string'], 'example' => ['Battery runtime is average (~6 hours)', 'RAM cannot be upgraded after purchase']],
                    'themes' => ['type' => 'array', 'items' => ['type' => 'string'], 'example' => ['Display Quality', 'Build Quality', 'Performance', 'Battery Life']],
                    'verdict' => ['type' => 'string', 'example' => 'High-value portable laptop ideal for software engineering and creative coursework.'],
                    'reviews_count' => ['type' => 'integer', 'example' => 14],
                    'generated_at' => ['type' => 'string', 'format' => 'date-time', 'example' => '2026-11-15T08:00:00Z'],
                ],
                'required' => ['id', 'pros', 'cons', 'themes', 'verdict', 'reviews_count', 'generated_at'],
            ],
            'CompareMatrix' => [
                'type' => 'object',
                'properties' => [
                    'category' => [
                        'type' => 'object',
                        'properties' => [
                            'id' => ['type' => 'integer', 'example' => 5],
                            'name' => ['type' => 'string', 'example' => 'Laptops'],
                            'slug' => ['type' => 'string', 'example' => 'laptops'],
                        ],
                        'required' => ['id', 'name', 'slug'],
                    ],
                    'products' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/ProductCard']],
                    'rows' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'key' => ['type' => 'string', 'example' => 'ram_gb'],
                                'label' => ['type' => 'string', 'example' => 'RAM'],
                                'unit' => ['type' => ['string', 'null'], 'example' => 'GB'],
                                'data_type' => ['type' => 'string', 'enum' => ['number', 'boolean', 'text'], 'example' => 'number'],
                                'higher_is_better' => ['type' => ['boolean', 'null'], 'example' => true],
                                'winner_product_id' => ['type' => ['integer', 'null'], 'example' => 22],
                                'values' => [
                                    'type' => 'array',
                                    'items' => [
                                        'type' => 'object',
                                        'properties' => [
                                            'product_id' => ['type' => 'integer', 'example' => 14],
                                            'value' => [
                                                'oneOf' => [
                                                    ['type' => 'string'],
                                                    ['type' => 'number'],
                                                    ['type' => 'boolean'],
                                                    ['type' => 'null'],
                                                ],
                                                'example' => 16,
                                            ],
                                        ],
                                        'required' => ['product_id', 'value'],
                                    ],
                                ],
                            ],
                            'required' => ['key', 'label', 'data_type', 'values'],
                        ],
                    ],
                ],
                'required' => ['category', 'products', 'rows'],
            ],
            'CompareVerdict' => [
                'type' => 'object',
                'properties' => [
                    'summary' => ['type' => 'string', 'example' => 'The MacBook Air is unmatched for battery runtime and portability, while the Lenovo Yoga provides superior multitasking RAM and display fluidity.'],
                    'items' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'product_id' => ['type' => 'integer', 'example' => 14],
                                'fit_score' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 100, 'example' => 86],
                                'strengths' => ['type' => 'array', 'items' => ['type' => 'string'], 'example' => ['16GB RAM for containers', '90Hz OLED panel']],
                                'tradeoffs' => ['type' => 'array', 'items' => ['type' => 'string'], 'example' => ['Shorter battery runtime']],
                                'verdict' => ['type' => 'string', 'example' => 'Best pick for heavy multitasking workflows.'],
                            ],
                            'required' => ['product_id', 'fit_score', 'strengths', 'tradeoffs', 'verdict'],
                        ],
                    ],
                    'winner_product_id' => ['type' => ['integer', 'null'], 'example' => 22],
                ],
                'required' => ['summary', 'items', 'winner_product_id'],
            ],
            'WishlistItem' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer', 'example' => 7],
                    'product' => ['$ref' => '#/components/schemas/ProductCard'],
                    'added_at' => ['type' => 'string', 'format' => 'date-time', 'example' => '2026-11-12T16:00:00Z'],
                ],
                'required' => ['id', 'product', 'added_at'],
            ],
            'SavedComparison' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer', 'example' => 3],
                    'title' => ['type' => 'string', 'example' => 'Ultrabooks 2026'],
                    'category_id' => ['type' => 'integer', 'example' => 5],
                    'product_ids' => ['type' => 'array', 'items' => ['type' => 'integer'], 'example' => [14, 22]],
                    'share_token' => ['type' => ['string', 'null'], 'example' => 'tok_9f8e7d6c5b4a321012345678abcdef01'],
                    'share_url' => ['type' => ['string', 'null'], 'example' => 'http://localhost:8080/compare/tok_9f8e7d6c5b4a321012345678abcdef01'],
                    'verdict' => [
                        'oneOf' => [
                            ['$ref' => '#/components/schemas/CompareVerdict'],
                            ['type' => 'null'],
                        ],
                    ],
                    'created_at' => ['type' => 'string', 'format' => 'date-time', 'example' => '2026-11-14T09:00:00Z'],
                    'updated_at' => ['type' => 'string', 'format' => 'date-time', 'example' => '2026-11-14T09:00:00Z'],
                ],
                'required' => ['id', 'title', 'category_id', 'product_ids', 'created_at', 'updated_at'],
            ],
            'AssistantQuota' => [
                'type' => 'object',
                'properties' => [
                    'total_limit' => ['type' => 'integer', 'example' => 20, 'description' => 'Maximum allowed AI operations per day'],
                    'used_today' => ['type' => 'integer', 'example' => 4, 'description' => 'Successful AI calls consumed today'],
                    'remaining' => ['type' => 'integer', 'example' => 16, 'description' => 'Remaining calls until reset'],
                    'resets_at' => ['type' => 'string', 'format' => 'date-time', 'example' => '2026-11-20T00:00:00Z', 'description' => 'UTC midnight reset timestamp'],
                ],
                'required' => ['total_limit', 'used_today', 'remaining', 'resets_at'],
            ],
            'AssistantConversation' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer', 'example' => 12],
                    'title' => ['type' => 'string', 'example' => 'Developer laptop under ₹90k'],
                    'messages_count' => ['type' => 'integer', 'example' => 4],
                    'latest_message_at' => ['type' => ['string', 'null'], 'format' => 'date-time', 'example' => '2026-11-18T10:15:00Z'],
                    'created_at' => ['type' => 'string', 'format' => 'date-time', 'example' => '2026-11-18T10:00:00Z'],
                    'updated_at' => ['type' => 'string', 'format' => 'date-time', 'example' => '2026-11-18T10:15:00Z'],
                ],
                'required' => ['id', 'title', 'messages_count', 'created_at', 'updated_at'],
            ],
            'AssistantMessage' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer', 'example' => 45],
                    'role' => ['type' => 'string', 'enum' => ['user', 'assistant'], 'example' => 'assistant'],
                    'content' => ['type' => 'string', 'example' => 'Here are two laptops under ₹90,000 tailored for development.'],
                    'status' => ['type' => 'string', 'enum' => ['ok', 'fallback', 'error'], 'example' => 'ok'],
                    'recommendations' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'product_id' => ['type' => 'integer', 'example' => 14],
                                'product' => ['$ref' => '#/components/schemas/ProductCard'],
                                'reason' => ['type' => 'string', 'example' => 'Fast Ryzen processor and 16GB RAM manage IDEs effortlessly.'],
                                'tradeoffs' => ['type' => 'array', 'items' => ['type' => 'string'], 'example' => ['Battery runtime is approximately 6 hours.']],
                            ],
                            'required' => ['product_id', 'reason'],
                        ],
                    ],
                    'alternatives' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'product_id' => ['type' => 'integer', 'example' => 22],
                                'product' => ['$ref' => '#/components/schemas/ProductCard'],
                                'reason' => ['type' => 'string', 'example' => 'Slightly over budget but offers outstanding 18-hour battery.'],
                            ],
                            'required' => ['product_id', 'reason'],
                        ],
                    ],
                    'created_at' => ['type' => 'string', 'format' => 'date-time', 'example' => '2026-11-18T10:15:00Z'],
                ],
                'required' => ['id', 'role', 'content', 'status', 'created_at'],
            ],
            'AdminDashboard' => [
                'type' => 'object',
                'properties' => [
                    'catalog' => [
                        'type' => 'object',
                        'properties' => [
                            'total_products' => ['type' => 'integer', 'example' => 60],
                            'published_products' => ['type' => 'integer', 'example' => 54],
                            'draft_products' => ['type' => 'integer', 'example' => 6],
                        ],
                        'required' => ['total_products', 'published_products', 'draft_products'],
                    ],
                    'users' => [
                        'type' => 'object',
                        'properties' => [
                            'total_users' => ['type' => 'integer', 'example' => 150],
                            'active_users' => ['type' => 'integer', 'example' => 147],
                            'customer_count' => ['type' => 'integer', 'example' => 145],
                            'admin_count' => ['type' => 'integer', 'example' => 5],
                        ],
                        'required' => ['total_users', 'active_users', 'customer_count', 'admin_count'],
                    ],
                    'reviews' => [
                        'type' => 'object',
                        'properties' => [
                            'pending_count' => ['type' => 'integer', 'example' => 4],
                            'approved_count' => ['type' => 'integer', 'example' => 182],
                            'rejected_count' => ['type' => 'integer', 'example' => 8],
                        ],
                        'required' => ['pending_count', 'approved_count', 'rejected_count'],
                    ],
                    'ai_telemetry' => [
                        'type' => 'object',
                        'properties' => [
                            'today_calls' => ['type' => 'integer', 'example' => 84],
                            'today_tokens' => ['type' => 'integer', 'example' => 112500],
                            'avg_latency_ms' => ['type' => 'number', 'example' => 840],
                            'error_rate' => ['type' => 'number', 'example' => 0.012],
                        ],
                        'required' => ['today_calls', 'today_tokens', 'avg_latency_ms', 'error_rate'],
                    ],
                    'recent_activity' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/AdminActivityLog']],
                    'pending_reviews' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/Review']],
                ],
                'required' => ['catalog', 'users', 'reviews', 'ai_telemetry', 'recent_activity', 'pending_reviews'],
            ],
            'AdminAiUsage' => [
                'type' => 'object',
                'properties' => [
                    'summary' => [
                        'type' => 'object',
                        'properties' => [
                            'total_calls' => ['type' => 'integer', 'example' => 450],
                            'successful_calls' => ['type' => 'integer', 'example' => 442],
                            'error_calls' => ['type' => 'integer', 'example' => 5],
                            'rate_limited_calls' => ['type' => 'integer', 'example' => 3],
                            'error_rate' => ['type' => 'number', 'example' => 0.011],
                            'total_prompt_tokens' => ['type' => 'integer', 'example' => 520000],
                            'total_completion_tokens' => ['type' => 'integer', 'example' => 160000],
                            'avg_response_time_ms' => ['type' => 'number', 'example' => 815],
                        ],
                        'required' => ['total_calls', 'successful_calls', 'error_calls', 'rate_limited_calls', 'error_rate', 'avg_response_time_ms'],
                    ],
                    'timeseries' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'date' => ['type' => 'string', 'format' => 'date', 'example' => '2026-11-18'],
                                'total_calls' => ['type' => 'integer', 'example' => 68],
                                'successful_calls' => ['type' => 'integer', 'example' => 67],
                                'error_calls' => ['type' => 'integer', 'example' => 1],
                                'avg_response_time_ms' => ['type' => 'number', 'example' => 790],
                                'total_tokens' => ['type' => 'integer', 'example' => 98000],
                            ],
                            'required' => ['date', 'total_calls', 'successful_calls', 'error_calls'],
                        ],
                    ],
                    'features' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'feature' => ['type' => 'string', 'example' => 'assistant'],
                                'calls' => ['type' => 'integer', 'example' => 280],
                                'avg_latency_ms' => ['type' => 'number', 'example' => 850],
                                'errors' => ['type' => 'integer', 'example' => 2],
                            ],
                            'required' => ['feature', 'calls', 'avg_latency_ms', 'errors'],
                        ],
                    ],
                    'top_consumers' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'user_id' => ['type' => ['integer', 'null'], 'example' => 8],
                                'user_name' => ['type' => ['string', 'null'], 'example' => 'Priya Sharma'],
                                'call_count' => ['type' => 'integer', 'example' => 35],
                                'token_count' => ['type' => 'integer', 'example' => 48200],
                            ],
                            'required' => ['call_count', 'token_count'],
                        ],
                    ],
                    'logs' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'id' => ['type' => 'integer', 'example' => 240],
                                'feature' => ['type' => 'string', 'example' => 'assistant'],
                                'status' => ['type' => 'string', 'example' => 'success'],
                                'duration_ms' => ['type' => 'integer', 'example' => 780],
                                'tokens_prompt' => ['type' => 'integer', 'example' => 1250],
                                'tokens_completion' => ['type' => 'integer', 'example' => 380],
                                'created_at' => ['type' => 'string', 'format' => 'date-time', 'example' => '2026-11-18T11:05:00Z'],
                            ],
                            'required' => ['id', 'feature', 'status', 'duration_ms', 'created_at'],
                        ],
                    ],
                ],
                'required' => ['summary', 'timeseries', 'features', 'top_consumers', 'logs'],
            ],
            'AdminActivityLog' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer', 'example' => 85],
                    'admin' => [
                        'type' => ['object', 'null'],
                        'properties' => [
                            'id' => ['type' => 'integer', 'example' => 1],
                            'name' => ['type' => 'string', 'example' => 'Admin User'],
                            'email' => ['type' => 'string', 'example' => 'admin@pickwise.local'],
                        ],
                        'required' => ['id', 'name', 'email'],
                    ],
                    'action' => ['type' => 'string', 'example' => 'product.updated'],
                    'subject_type' => ['type' => ['string', 'null'], 'example' => 'App\\Models\\Product'],
                    'subject_id' => ['type' => ['integer', 'null'], 'example' => 14],
                    'properties' => [
                        'type' => 'object',
                        'properties' => [
                            'before' => ['type' => 'object', 'example' => ['price' => 8999900]],
                            'after' => ['type' => 'object', 'example' => ['price' => 8499900]],
                            'created' => ['type' => 'object'],
                            'deleted' => ['type' => 'object'],
                        ],
                    ],
                    'ip_address' => ['type' => ['string', 'null'], 'example' => '127.0.0.1'],
                    'created_at' => ['type' => 'string', 'format' => 'date-time', 'example' => '2026-11-18T14:32:00Z'],
                ],
                'required' => ['id', 'action', 'properties', 'created_at'],
            ],
            'PaginatedActivityLogsResponse' => [
                'type' => 'object',
                'properties' => [
                    'data' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/AdminActivityLog']],
                    'meta' => ['$ref' => '#/components/schemas/ApiMeta'],
                    'links' => ['$ref' => '#/components/schemas/ApiLinks'],
                ],
                'required' => ['data', 'meta', 'links'],
            ],
            'PaginatedUsersResponse' => [
                'type' => 'object',
                'properties' => [
                    'data' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/User']],
                    'meta' => ['$ref' => '#/components/schemas/ApiMeta'],
                    'links' => ['$ref' => '#/components/schemas/ApiLinks'],
                ],
                'required' => ['data', 'meta', 'links'],
            ],
            // Request payload schemas
            'RegisterRequest' => [
                'type' => 'object',
                'properties' => [
                    'name' => ['type' => 'string', 'example' => 'Priya Sharma'],
                    'email' => ['type' => 'string', 'format' => 'email', 'example' => 'priya@example.com'],
                    'password' => ['type' => 'string', 'format' => 'password', 'minLength' => 8, 'example' => 'P@ssword123'],
                    'password_confirmation' => ['type' => 'string', 'format' => 'password', 'example' => 'P@ssword123'],
                ],
                'required' => ['name', 'email', 'password', 'password_confirmation'],
            ],
            'LoginRequest' => [
                'type' => 'object',
                'properties' => [
                    'email' => ['type' => 'string', 'format' => 'email', 'example' => 'priya@example.com'],
                    'password' => ['type' => 'string', 'format' => 'password', 'example' => 'P@ssword123'],
                    'remember' => ['type' => 'boolean', 'example' => true],
                ],
                'required' => ['email', 'password'],
            ],
            'UpdateProfileRequest' => [
                'type' => 'object',
                'properties' => [
                    'name' => ['type' => 'string', 'example' => 'Priya Sharma'],
                    'email' => ['type' => 'string', 'format' => 'email', 'example' => 'priya.new@example.com'],
                ],
                'required' => ['name', 'email'],
            ],
            'UpdatePasswordRequest' => [
                'type' => 'object',
                'properties' => [
                    'current_password' => ['type' => 'string', 'format' => 'password', 'example' => 'CurrentP@ssword123'],
                    'password' => ['type' => 'string', 'format' => 'password', 'minLength' => 8, 'example' => 'NewP@ssword456'],
                    'password_confirmation' => ['type' => 'string', 'format' => 'password', 'example' => 'NewP@ssword456'],
                ],
                'required' => ['current_password', 'password', 'password_confirmation'],
            ],
            'UpdatePreferencesRequest' => [
                'type' => 'object',
                'properties' => [
                    'default_budget_max' => ['type' => ['number', 'null'], 'example' => 85000],
                    'favorite_categories' => ['type' => 'array', 'items' => ['type' => 'string'], 'example' => ['laptops']],
                    'prioritized_specs' => ['type' => 'array', 'items' => ['type' => 'string'], 'example' => ['ram_gb']],
                ],
            ],
            'CompareRequest' => [
                'type' => 'object',
                'properties' => [
                    'product_ids' => ['type' => 'array', 'items' => ['type' => 'integer'], 'minItems' => 2, 'maxItems' => 4, 'example' => [14, 22]],
                ],
                'required' => ['product_ids'],
            ],
            'CompareVerdictRequest' => [
                'type' => 'object',
                'properties' => [
                    'product_ids' => ['type' => 'array', 'items' => ['type' => 'integer'], 'minItems' => 2, 'maxItems' => 4, 'example' => [14, 22]],
                    'priority' => ['type' => 'string', 'example' => 'battery_life'],
                    'comparison_id' => ['type' => 'integer', 'example' => 3],
                ],
                'required' => ['product_ids'],
            ],
            'StoreReviewRequest' => [
                'type' => 'object',
                'properties' => [
                    'rating' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 5, 'example' => 5],
                    'title' => ['type' => 'string', 'example' => 'Great performance and build'],
                    'body' => ['type' => 'string', 'example' => 'Compiles massive projects without lag.'],
                ],
                'required' => ['rating', 'title', 'body'],
            ],
            'UpdateReviewRequest' => [
                'type' => 'object',
                'properties' => [
                    'rating' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 5, 'example' => 4],
                    'title' => ['type' => 'string', 'example' => 'Updated review title'],
                    'body' => ['type' => 'string', 'example' => 'Updated review body.'],
                ],
            ],
            'StoreWishlistRequest' => [
                'type' => 'object',
                'properties' => [
                    'product_id' => ['type' => 'integer', 'example' => 14],
                ],
                'required' => ['product_id'],
            ],
            'StoreComparisonRequest' => [
                'type' => 'object',
                'properties' => [
                    'title' => ['type' => 'string', 'example' => 'Top Ultrabooks 2026'],
                    'category_id' => ['type' => 'integer', 'example' => 5],
                    'product_ids' => ['type' => 'array', 'items' => ['type' => 'integer'], 'minItems' => 2, 'maxItems' => 4, 'example' => [14, 22]],
                    'verdict' => ['$ref' => '#/components/schemas/CompareVerdict'],
                ],
                'required' => ['title', 'category_id', 'product_ids'],
            ],
            'UpdateComparisonRequest' => [
                'type' => 'object',
                'properties' => [
                    'title' => ['type' => 'string', 'example' => 'Renamed Comparison'],
                    'product_ids' => ['type' => 'array', 'items' => ['type' => 'integer'], 'minItems' => 2, 'maxItems' => 4, 'example' => [14, 22]],
                    'verdict' => ['$ref' => '#/components/schemas/CompareVerdict'],
                ],
            ],
            'StoreAssistantConversationRequest' => [
                'type' => 'object',
                'properties' => [
                    'title' => ['type' => 'string', 'example' => 'Gaming laptop recommendation'],
                ],
            ],
            'StoreAssistantMessageRequest' => [
                'type' => 'object',
                'properties' => [
                    'message' => ['type' => 'string', 'example' => 'Find me a lightweight laptop under ₹80,000 for programming.'],
                    'category' => ['type' => 'string', 'example' => 'laptops'],
                    'budget_max' => ['type' => 'number', 'example' => 80000],
                ],
                'required' => ['message'],
            ],
            'StoreCategoryRequest' => [
                'type' => 'object',
                'properties' => [
                    'name' => ['type' => 'string', 'example' => 'Tablets'],
                    'slug' => ['type' => 'string', 'example' => 'tablets'],
                    'description' => ['type' => 'string', 'example' => 'Portable touchscreen devices'],
                    'icon' => ['type' => 'string', 'example' => 'tablet'],
                    'parent_id' => ['type' => ['integer', 'null'], 'example' => 1],
                ],
                'required' => ['name'],
            ],
            'UpdateCategoryRequest' => [
                'type' => 'object',
                'properties' => [
                    'name' => ['type' => 'string', 'example' => 'Tablets & E-Readers'],
                    'slug' => ['type' => 'string', 'example' => 'tablets'],
                    'description' => ['type' => 'string'],
                    'icon' => ['type' => 'string'],
                    'parent_id' => ['type' => ['integer', 'null']],
                ],
            ],
            'StoreSpecDefinitionRequest' => [
                'type' => 'object',
                'properties' => [
                    'name' => ['type' => 'string', 'example' => 'RAM Capacity'],
                    'key' => ['type' => 'string', 'example' => 'ram_gb'],
                    'data_type' => ['type' => 'string', 'enum' => ['number', 'boolean', 'text'], 'example' => 'number'],
                    'unit' => ['type' => 'string', 'example' => 'GB'],
                    'is_filterable' => ['type' => 'boolean', 'example' => true],
                    'is_comparable' => ['type' => 'boolean', 'example' => true],
                    'higher_is_better' => ['type' => 'boolean', 'example' => true],
                    'filter_type' => ['type' => 'string', 'enum' => ['range', 'boolean', 'select'], 'example' => 'select'],
                    'sort_order' => ['type' => 'integer', 'example' => 2],
                    'options' => ['type' => 'array', 'items' => ['type' => 'string'], 'example' => ['8', '16', '32']],
                ],
                'required' => ['name', 'key', 'data_type'],
            ],
            'UpdateSpecDefinitionRequest' => [
                'type' => 'object',
                'properties' => [
                    'name' => ['type' => 'string'],
                    'unit' => ['type' => 'string'],
                    'is_filterable' => ['type' => 'boolean'],
                    'is_comparable' => ['type' => 'boolean'],
                    'higher_is_better' => ['type' => 'boolean'],
                    'filter_type' => ['type' => 'string', 'enum' => ['range', 'boolean', 'select']],
                    'sort_order' => ['type' => 'integer'],
                    'options' => ['type' => 'array', 'items' => ['type' => 'string']],
                ],
            ],
            'StoreBrandRequest' => [
                'type' => 'object',
                'properties' => [
                    'name' => ['type' => 'string', 'example' => 'Apple'],
                    'slug' => ['type' => 'string', 'example' => 'apple'],
                    'website' => ['type' => 'string', 'format' => 'uri', 'example' => 'https://www.apple.com'],
                ],
                'required' => ['name'],
            ],
            'UpdateBrandRequest' => [
                'type' => 'object',
                'properties' => [
                    'name' => ['type' => 'string'],
                    'slug' => ['type' => 'string'],
                    'website' => ['type' => 'string', 'format' => 'uri'],
                ],
            ],
            'StoreProductRequest' => [
                'type' => 'object',
                'properties' => [
                    'name' => ['type' => 'string', 'example' => 'MacBook Air 15 M3'],
                    'slug' => ['type' => 'string', 'example' => 'macbook-air-15-m3'],
                    'brand_id' => ['type' => 'integer', 'example' => 1],
                    'category_id' => ['type' => 'integer', 'example' => 5],
                    'price' => ['type' => 'number', 'example' => 134900],
                    'original_price' => ['type' => 'number', 'example' => 144900],
                    'description' => ['type' => 'string', 'example' => '15-inch Liquid Retina display with M3 silicon.'],
                    'store_url' => ['type' => 'string', 'format' => 'uri', 'example' => 'https://www.apple.com/in/macbook-air/'],
                    'is_published' => ['type' => 'boolean', 'default' => true],
                    'is_available' => ['type' => 'boolean', 'default' => true],
                    'stock_count' => ['type' => 'integer', 'default' => 20],
                    'specs' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'key' => ['type' => 'string', 'example' => 'ram_gb'],
                                'value' => ['oneOf' => [['type' => 'string'], ['type' => 'number'], ['type' => 'boolean']], 'example' => 16],
                            ],
                            'required' => ['key', 'value'],
                        ],
                    ],
                ],
                'required' => ['name', 'brand_id', 'category_id', 'price', 'description', 'store_url'],
            ],
            'UpdateProductRequest' => [
                'type' => 'object',
                'properties' => [
                    'name' => ['type' => 'string'],
                    'slug' => ['type' => 'string'],
                    'brand_id' => ['type' => 'integer'],
                    'category_id' => ['type' => 'integer'],
                    'price' => ['type' => 'number'],
                    'original_price' => ['type' => 'number'],
                    'description' => ['type' => 'string'],
                    'store_url' => ['type' => 'string', 'format' => 'uri'],
                    'is_published' => ['type' => 'boolean'],
                    'is_available' => ['type' => 'boolean'],
                    'stock_count' => ['type' => 'integer'],
                    'specs' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'key' => ['type' => 'string'],
                                'value' => ['oneOf' => [['type' => 'string'], ['type' => 'number'], ['type' => 'boolean']]],
                            ],
                            'required' => ['key', 'value'],
                        ],
                    ],
                ],
            ],
            'BulkProductStatusRequest' => [
                'type' => 'object',
                'properties' => [
                    'product_ids' => ['type' => 'array', 'items' => ['type' => 'integer'], 'minItems' => 1, 'example' => [14, 22]],
                    'is_published' => ['type' => 'boolean', 'example' => true],
                ],
                'required' => ['product_ids', 'is_published'],
            ],
            'StoreProductImageRequest' => [
                'type' => 'object',
                'properties' => [
                    'image' => ['type' => 'string', 'format' => 'binary', 'description' => 'Image file (jpeg, png, webp <= 5MB)'],
                    'alt_text' => ['type' => 'string', 'example' => 'Front view of laptop'],
                    'is_primary' => ['type' => 'boolean', 'default' => false],
                ],
                'required' => ['image', 'alt_text'],
            ],
            'UpdateProductImageRequest' => [
                'type' => 'object',
                'properties' => [
                    'alt_text' => ['type' => 'string', 'example' => 'Updated alt description'],
                    'is_primary' => ['type' => 'boolean', 'example' => true],
                    'sort_order' => ['type' => 'integer', 'example' => 1],
                ],
            ],
            'ReorderProductImagesRequest' => [
                'type' => 'object',
                'properties' => [
                    'order' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'id' => ['type' => 'integer', 'example' => 101],
                                'sort_order' => ['type' => 'integer', 'example' => 0],
                            ],
                            'required' => ['id', 'sort_order'],
                        ],
                    ],
                ],
                'required' => ['order'],
            ],
            'UpdateUserRequest' => [
                'type' => 'object',
                'properties' => [
                    'is_active' => ['type' => 'boolean', 'example' => true],
                    'role' => ['type' => 'string', 'enum' => ['customer', 'admin'], 'example' => 'customer'],
                ],
            ],
            'BulkReviewStatusRequest' => [
                'type' => 'object',
                'properties' => [
                    'review_ids' => ['type' => 'array', 'items' => ['type' => 'integer'], 'minItems' => 1, 'example' => [12, 15]],
                    'status' => ['type' => 'string', 'enum' => ['approved', 'rejected'], 'example' => 'approved'],
                    'rejection_reason' => ['type' => 'string', 'example' => 'Off-topic review content'],
                ],
                'required' => ['review_ids', 'status'],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function buildResponses(): array
    {
        return [
            'UnauthorizedError' => [
                'description' => 'Unauthenticated (missing or invalid session cookie)',
                'content' => [
                    'application/json' => [
                        'schema' => ['$ref' => '#/components/schemas/ApiErrorResponse'],
                        'example' => [
                            'error' => [
                                'code' => 'unauthenticated',
                                'message' => 'Unauthenticated.',
                                'request_id' => 'req_01j7abc123xyz',
                            ],
                        ],
                    ],
                ],
            ],
            'ForbiddenError' => [
                'description' => 'Forbidden (insufficient permissions or inactive account)',
                'content' => [
                    'application/json' => [
                        'schema' => ['$ref' => '#/components/schemas/ApiErrorResponse'],
                        'example' => [
                            'error' => [
                                'code' => 'forbidden',
                                'message' => 'This action is unauthorized.',
                                'request_id' => 'req_01j7abc123xyz',
                            ],
                        ],
                    ],
                ],
            ],
            'NotFoundError' => [
                'description' => 'Resource not found',
                'content' => [
                    'application/json' => [
                        'schema' => ['$ref' => '#/components/schemas/ApiErrorResponse'],
                        'example' => [
                            'error' => [
                                'code' => 'not_found',
                                'message' => 'Resource not found.',
                                'request_id' => 'req_01j7abc123xyz',
                            ],
                        ],
                    ],
                ],
            ],
            'ValidationError' => [
                'description' => 'Validation failed',
                'content' => [
                    'application/json' => [
                        'schema' => ['$ref' => '#/components/schemas/ValidationErrorResponse'],
                    ],
                ],
            ],
            'RateLimitError' => [
                'description' => 'Rate limit exceeded (HTTP 429)',
                'content' => [
                    'application/json' => [
                        'schema' => ['$ref' => '#/components/schemas/ApiErrorResponse'],
                        'example' => [
                            'error' => [
                                'code' => 'rate_limited',
                                'message' => 'Too many requests. Please slow down.',
                                'request_id' => 'req_01j7abc123xyz',
                            ],
                        ],
                    ],
                ],
            ],
            'AiQuotaError' => [
                'description' => 'Daily AI quota exceeded (HTTP 429)',
                'content' => [
                    'application/json' => [
                        'schema' => ['$ref' => '#/components/schemas/ApiErrorResponse'],
                        'example' => [
                            'error' => [
                                'code' => 'ai_quota_exceeded',
                                'message' => 'Daily AI limit reached. Please try again tomorrow.',
                                'request_id' => 'req_01j7abc123xyz',
                            ],
                        ],
                    ],
                ],
            ],
            'AiUnavailableError' => [
                'description' => 'AI inference service unavailable (HTTP 503)',
                'content' => [
                    'application/json' => [
                        'schema' => ['$ref' => '#/components/schemas/ApiErrorResponse'],
                        'example' => [
                            'error' => [
                                'code' => 'ai_unavailable',
                                'message' => 'The AI service is temporarily unavailable. Please try again in a moment.',
                                'request_id' => 'req_01j7abc123xyz',
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    /**
     * Dump a PHP array as clean, human-readable YAML.
     *
     * @param  array<array-key, mixed>  $data
     */
    public static function dumpYaml(array $data, int $indent = 0): string
    {
        $yaml = '';
        $prefix = str_repeat('  ', $indent);
        $isList = array_is_list($data);

        foreach ($data as $key => $value) {
            if ($isList) {
                if (is_array($value)) {
                    if (empty($value)) {
                        $yaml .= "{$prefix}- []\n";
                    } elseif (array_is_list($value)) {
                        $yaml .= "{$prefix}-\n".self::dumpYaml($value, $indent + 1);
                    } else {
                        // Associative array item in a list: format first key on same line with '- '
                        $first = true;
                        foreach ($value as $subKey => $subVal) {
                            $escapedSubKey = self::escapeYamlKey((string) $subKey);
                            if ($first) {
                                if (is_array($subVal)) {
                                    if (empty($subVal)) {
                                        $yaml .= "{$prefix}- {$escapedSubKey}: []\n";
                                    } else {
                                        $yaml .= "{$prefix}- {$escapedSubKey}:\n".self::dumpYaml($subVal, $indent + 2);
                                    }
                                } else {
                                    $yaml .= "{$prefix}- {$escapedSubKey}: ".self::formatYamlScalar($subVal, $indent + 1)."\n";
                                }
                                $first = false;
                            } else {
                                if (is_array($subVal)) {
                                    if (empty($subVal)) {
                                        $yaml .= "{$prefix}  {$escapedSubKey}: []\n";
                                    } else {
                                        $yaml .= "{$prefix}  {$escapedSubKey}:\n".self::dumpYaml($subVal, $indent + 2);
                                    }
                                } else {
                                    $yaml .= "{$prefix}  {$escapedSubKey}: ".self::formatYamlScalar($subVal, $indent + 1)."\n";
                                }
                            }
                        }
                    }
                } else {
                    $yaml .= "{$prefix}- ".self::formatYamlScalar($value, $indent)."\n";
                }
            } else {
                $escapedKey = self::escapeYamlKey((string) $key);
                if (is_array($value)) {
                    if (empty($value)) {
                        $yaml .= "{$prefix}{$escapedKey}: []\n";
                    } else {
                        $yaml .= "{$prefix}{$escapedKey}:\n".self::dumpYaml($value, $indent + 1);
                    }
                } else {
                    $yaml .= "{$prefix}{$escapedKey}: ".self::formatYamlScalar($value, $indent)."\n";
                }
            }
        }

        return $yaml;
    }

    /**
     * Escape and quote YAML scalar values when necessary.
     */
    private static function formatYamlScalar(mixed $value, int $indent = 0): string
    {
        if ($value === null) {
            return 'null';
        }

        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }

        $str = (string) $value;

        if (str_contains($str, "\n")) {
            $blockIndent = str_repeat('  ', $indent + 1);
            $lines = explode("\n", $str);
            $res = "|\n";
            foreach ($lines as $line) {
                $res .= $blockIndent.$line."\n";
            }

            return rtrim($res);
        }

        if (
            $str === '' ||
            preg_match('/[:#{}\[\],&*?|<>=!%@`]/', $str) === 1 ||
            in_array(strtolower($str), ['true', 'false', 'null', 'yes', 'no', 'on', 'off'], true) ||
            is_numeric($str)
        ) {
            return json_encode($str, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: "\"{$str}\"";
        }

        return $str;
    }

    /**
     * Escape YAML mapping key.
     */
    private static function escapeYamlKey(string $key): string
    {
        if (is_numeric($key)) {
            return "'{$key}'";
        }

        if (preg_match('/^[a-zA-Z0-9_\-\.\/]+$/', $key) === 1) {
            return $key;
        }

        return '"'.addcslashes($key, '"\\').'"';
    }
}
