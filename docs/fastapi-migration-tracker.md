# FastAPI Migration Tracker

**Target:** Migrate backend from Laravel 13 (PHP 8.3) to FastAPI (Python 3.12+ / Pydantic v2 / SQLAlchemy 2.0 async)  
**Goal:** 100% API parity with existing React 19 frontend, enhanced AI streaming capabilities, and seamless Docker orchestration.  
**Current status:** Planning & Task Definition  
**Legend:** `[ ]` Not started · `[~]` In progress · `[x]` Completed  

---

## Architecture & Technology Mapping

| Component | Laravel 13 (Current) | FastAPI Target | Parity / Adaptation Strategy |
| :--- | :--- | :--- | :--- |
| **Language & Runtime** | PHP 8.3 (PHP-FPM) | Python 3.12+ (Uvicorn / ASGI) | Non-blocking `asyncio` for all I/O |
| **Framework** | Laravel 13 | FastAPI 0.115+ | Modular `APIRouter` structure |
| **Data Validation / DTOs** | FormRequest / Rules | Pydantic v2 `BaseModel` | Strict typing, auto JSON schema generation |
| **ORM & Database** | Eloquent + `pg_trgm` | SQLAlchemy 2.0 (async) + `asyncpg` | Preserve exact schema, FTS `tsvector`, and trigram indices |
| **Migrations** | Artisan Migrations | Alembic | Version-controlled async migrations |
| **Authentication** | Laravel Sanctum SPA Cookies | HttpOnly Cookie Session / JWT + CSRF | Seamless compatibility with existing frontend `api-client.ts` |
| **Cache & Sessions** | Redis (`phpredis`) | `redis-py` (asyncio) | Cache key parity, facet caching, session storage |
| **Rate Limits & Quota** | Laravel Throttle + `ai-quota` | `slowapi` + custom Redis Token Bucket | Identical rate limits and 429 response structures |
| **AI Client** | Custom `GroqClient` (HTTP) | Official `groq` Python SDK (async) | Same prompts, schema validation, and grounding |
| **Background Queue** | Laravel Queue (`database`/`redis`) | ARQ / Celery / `FastAPI.BackgroundTasks` | Review summary generation and audit logging |
| **Testing** | Pest / PHPUnit (40+ test suites) | `pytest` + `pytest-asyncio` + `httpx` | Full parity across unit, feature, and security tests |
| **Reverse Proxy** | Nginx (`fastcgi_pass app:9000`) | Nginx (`proxy_pass http://app:8000`) | Identical security headers and route proxying |

---

## Phase F0: Project Setup, Tooling & Foundations

- [ ] **F0-S1: Initialize Python project structure & dependencies** `chore(fastapi)`
  - Create `backend-fastapi/` directory (or prepare `backend/` replacement branch).
  - Setup dependency manager (`pyproject.toml` with `uv` or `poetry`).
  - Install core packages: `fastapi`, `uvicorn[standard]`, `pydantic>=2.0`, `pydantic-settings`, `sqlalchemy[asyncio]>=2.0`, `asyncpg`, `alembic`, `redis>=5.0`, `groq`, `httpx`, `slowapi`, `passlib[bcrypt]`, `python-multipart`.
  - Install dev tooling: `pytest`, `pytest-asyncio`, `ruff` (linter/formatter), `mypy`.
  - Create configuration loader (`app/core/config.py`) reading `.env` (Postgres, Redis, Groq, App keys).

- [ ] **F0-S2: API conventions, standard response envelopes & exception handling** `feat(api)`
  - Standard response envelope model: `{"data": ...}` and `{"data": [...], "meta": {...}, "links": {...}}`.
  - Global exception handlers for 400, 401, 403, 404, 422 (validation errors), 429 (quota/rate limit), and 500.
  - Match Laravel error shape: `{"error": {"code": "...", "message": "...", "details": {...}, "request_id": "..."}}`.
  - Middleware: `X-Request-Id` header propagation and logging.
  - CORS middleware supporting Vite frontend origin.

- [ ] **F0-S3: Docker & local infrastructure setup** `chore(docker)`
  - Create `docker/fastapi/Dockerfile` (multi-stage build with Python 3.12-slim, non-root user).
  - Update `docker-compose.yml` to define `app` (FastAPI) running Uvicorn on port 8000.
  - Update `docker/nginx/default.conf` to proxy `/api/v1/` to `http://app:8000` via HTTP.
  - Ensure healthy startup order with PostgreSQL 17 and Redis 7.

- [ ] **F0-S4: Health check endpoint** `feat(health)`
  - Implement `GET /api/v1/health` with live checks for PostgreSQL connection, Redis ping, and Groq readiness.
  - Write Pytest integration tests for health check.

---

## Phase F1: Database Schema, Models & Seeders

- [ ] **F1-S1: Alembic setup & PostgreSQL extensions** `db(schema)`
  - Initialize Alembic with async driver support (`alembic.ini`, `env.py`).
  - Migration for PostgreSQL extensions: `pg_trgm` and `unaccent`.

- [ ] **F1-S2: SQLAlchemy 2.0 core declarative models** `db(models)`
  - `User`: id, name, email, hashed_password, role (`customer`, `admin`), preferences (JSONB), is_active, timestamps.
  - `Category`: id, name, slug, description, icon, parent_id, sort_order, timestamps.
  - `Brand`: id, name, slug, logo_url, website_url, timestamps.
  - `Product`: id, category_id, brand_id, name, slug, description, price, original_price, currency, rating, rating_count, value_score, is_active, is_published, metadata (JSONB), deleted_at, search_vector (`TSVectorType`), timestamps.
  - `ProductImage`: id, product_id, url, alt_text, sort_order, is_primary, timestamps.
  - `SpecDefinition`: id, category_id, name, key, data_type, unit, options (JSONB), is_filterable, is_comparable, higher_is_better, sort_order, timestamps.
  - `ProductSpec`: id, product_id, spec_definition_id, raw_value, numeric_value, boolean_value, timestamps.
  - `PriceHistory`: id, product_id, price, original_price, recorded_at, timestamps.
  - `Review`: id, product_id, user_id, rating, title, body, status, verified_purchase, timestamps.
  - `ReviewSummary`: id, product_id, pros (JSONB), cons (JSONB), common_themes (JSONB), bottom_line, generated_at, timestamps.
  - `WishlistItem`: id, user_id, product_id, timestamps.
  - `Comparison` & `ComparisonItem`: id, user_id, title, share_token, is_public, timestamps; order/product relations.
  - `AiConversation` & `AiMessage`: id, user_id, title, session_token; messages with token counts and JSON recommended products.
  - `AiUsageLog`: id, user_id, ip_address, feature, tokens_in, tokens_out, latency_ms, status_code, timestamps.
  - `AdminActivityLog`: id, user_id, action, subject_type, subject_id, changes (JSONB), ip_address, user_agent, created_at.

- [ ] **F1-S3: Indexes & full-text search definitions** `db(indexes)`
  - GIN index on `products.search_vector`.
  - Trigram GIN/GiST indexes on `products.name` and `brands.name` for typo tolerance.
  - Composite indexes on `(category_id, is_published, price)`, `(product_id, recorded_at)`, etc.

- [ ] **F1-S4: Deterministic demo seeders** `db(seeders)`
  - Python seeder scripts replicating the demo dataset:
    - 6 core categories (Laptops, Smartphones, Audio, Monitors, Smartwatches, Cameras).
    - ~60 realistic products with complete specs, prices, and price history series.
    - Deterministic review seeders with realistic mixed sentiment.
    - Default admin account (`admin@pickwise.test`) and customer account (`user@pickwise.test`).
  - Command: `python -m app.db.seed` or CLI entrypoint.

---

## Phase F2: Authentication, Session Management & Accounts

- [ ] **F2-S1: SPA cookie & CSRF compatibility layer** `feat(auth)`
  - Frontend contract: React expects `GET /sanctum/csrf-cookie` to set an `XSRF-TOKEN` cookie.
  - Implement CSRF middleware: issue `XSRF-TOKEN` cookie, require matching `X-XSRF-TOKEN` header on mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`).
  - Session/Token management: HttpOnly session cookie (stored in Redis or secure signed cookie) matching existing Sanctum behavior.

- [ ] **F2-S2: Authentication endpoints** `feat(auth)`
  - `POST /api/v1/auth/register` (validate email uniqueness, password rules, hash with bcrypt, create user, issue session).
  - `POST /api/v1/auth/login` (rate limit by email+IP, verify credentials, return user resource + cookie).
  - `POST /api/v1/auth/logout` (clear session in Redis, expire cookies).
  - `GET /api/v1/auth/me` (return current user payload with role and preferences).

- [ ] **F2-S3: Security dependencies & role-based access control** `feat(auth)`
  - FastAPI dependencies: `get_current_user`, `get_optional_user`, `require_admin`.
  - Rate limiting with `slowapi` on login and register endpoints.

- [ ] **F2-S4: Customer account management** `feat(account)`
  - `PATCH /api/v1/account/profile` (update name, email with duplicate check).
  - `PUT /api/v1/account/password` (verify current password, update hash).
  - `PUT /api/v1/account/preferences` (update JSONB preferences: budget, preferred categories).

---

## Phase F3: Catalog, Search & Filtering

- [ ] **F3-S1: Category & facet endpoints** `feat(catalog)`
  - `GET /api/v1/categories` (hierarchical category tree with product counts).
  - `GET /api/v1/categories/{slug}/filters` (calculate facets: dynamic price min/max, available brands, spec facets with options and counts).
  - `CatalogFacetCacheService`: Cache facet results in Redis with auto-invalidation on product/spec changes.

- [ ] **F3-S2: Value Score calculation engine** `feat(catalog)`
  - Port `ValueScoreCalculator`: Formula combining normalized spec values, price percentiles, and rating weighting.
  - Background/hook trigger to recalculate score when product specs or prices change.

- [ ] **F3-S3: PostgreSQL full-text search & trigram ranking** `feat(catalog)`
  - Implement `PostgresProductSearch` in SQLAlchemy:
    - Search query vector ranking using `ts_rank` against `search_vector`.
    - Typo-tolerant fallback with `func.similarity(Product.name, query)` via `pg_trgm`.
    - Faceted filters: category, brands (`brand[]`), price range (`price_min`, `price_max`), minimum rating (`rating_min`), in-stock availability.
    - Dynamic spec filters: `spec[ram]=16GB`, `spec[screen_size]=15:17`.
    - Sorting: `relevance`, `price_asc`, `price_desc`, `rating`, `value`, `newest`.
    - Pagination with metadata envelope (`current_page`, `per_page`, `total`, `last_page`).

- [ ] **F3-S4: Product detail, price history & similar products** `feat(catalog)`
  - `GET /api/v1/products/{slug}`: Include brand, category, images, formatted specs, rating aggregates, AI summary, and value score.
  - `GET /api/v1/products/{slug}/price-history`: Historical chronological price series for chart.
  - `GET /api/v1/products/{slug}/similar`: Find comparable products based on same category, price proximity, and key specs.

---

## Phase F4: Reviews, Wishlist & Comparison

- [ ] **F4-S1: Product reviews & rating aggregation** `feat(reviews)`
  - `GET /api/v1/products/{slug}/reviews`: Paginated list of approved reviews with user details.
  - `POST /api/v1/products/{slug}/reviews`: Authenticated endpoint to post review, enforce one review per user per product, status `pending`.
  - `PATCH /api/v1/reviews/{id}` & `DELETE /api/v1/reviews/{id}`: Policy allowing users to edit/delete their own reviews.
  - `ProductRatingAggregator`: Recalculate average rating and rating count when reviews are approved/deleted.

- [ ] **F4-S2: Wishlist management** `feat(wishlist)`
  - `GET /api/v1/wishlist`: Paginated wishlist for authenticated user with product cards and specs.
  - `POST /api/v1/wishlist`: Add product to wishlist.
  - `DELETE /api/v1/wishlist/{productId}`: Remove product from wishlist.

- [ ] **F4-S3: Side-by-side comparison matrix** `feat(compare)`
  - `POST /api/v1/compare`: Accept 2 to 4 product IDs.
  - `CompareMatrixBuilder`: Build comparative spec matrix grouped by spec categories, highlight differences, calculate row-level winners based on `higher_is_better`.

- [ ] **F4-S4: Saved comparisons & public sharing** `feat(compare)`
  - `GET /api/v1/comparisons`: List saved comparisons for current user.
  - `POST /api/v1/comparisons`: Save comparison with custom title and ordered product IDs.
  - `GET /api/v1/comparisons/{id}`, `PATCH /api/v1/comparisons/{id}`, `DELETE /api/v1/comparisons/{id}`.
  - `POST /api/v1/comparisons/{id}/share`: Generate unique alphanumeric share token.
  - `DELETE /api/v1/comparisons/{id}/share`: Revoke share token.
  - `GET /api/v1/shared/comparisons/{token}`: Public unauthenticated endpoint to view shared comparison matrix.

---

## Phase F5: AI Integration (Groq, Quotas & Shopping Assistant)

- [ ] **F5-S1: Async Groq client & mock client for tests** `feat(ai)`
  - Setup `GroqClient` using official `groq` async Python SDK.
  - Configure model (`llama-3.3-70b-versatile`), timeouts, JSON mode response schemas, and structured error handling.
  - Create `FakeGroqClient` for deterministic offline testing.

- [ ] **F5-S2: AI quota & usage tracking system** `feat(ai)`
  - Redis-backed sliding window rate limiter: track daily token/request budget per IP / user.
  - `AiQuotaService`: Verify quota before AI calls, record consumption.
  - Endpoint: `GET /api/v1/assistant/quota`.
  - Quota middleware/dependency: `ai-quota:assistant` and `ai-quota:compare`.
  - Log every AI request to `ai_usage_logs` table (tokens in/out, latency, status code).

- [ ] **F5-S3: Compare AI verdict** `feat(compare)`
  - `POST /api/v1/compare/verdict`: Generate structured verdict for 2–4 products.
  - Build prompt summarizing specs, differences, and user priorities; instruct Groq to output JSON with strengths, weaknesses, and clear recommendation.
  - Fallback logic when Groq is unreachable or fails schema validation.

- [ ] **F5-S4: AI review summary generation** `feat(ai)`
  - `ReviewSummaryService`: Aggregate approved product reviews, extract common themes, pros, cons, and bottom-line verdict.
  - Background task (ARQ / FastAPI `BackgroundTasks`) triggered automatically when reviews are approved in admin queue.
  - Cache summary in `review_summaries` table to deliver 0ms latency to end users.

- [ ] **F5-S5: Grounded AI shopping assistant** `feat(assistant)`
  - `AssistantService`: Multi-turn conversational shopping assistant.
  - Session resolution: Support both guest session tokens and authenticated user profiles (incorporating saved preferences).
  - Grounding algorithm:
    1. Parse budget, category, and requirements from user message.
    2. Query PostgreSQL for matching candidate products (enforcing real catalog constraints).
    3. Construct Groq prompt containing ONLY real candidate products.
    4. Validate Groq output JSON: strictly verify that every recommended product ID exists in the database before replying (anti-hallucination guarantee).
    5. Fallback cleanly if no products match or Groq is unavailable.
  - Endpoints:
    - `GET /api/v1/assistant/conversations` (list history).
    - `POST /api/v1/assistant/conversations` (create new conversation thread).
    - `GET /api/v1/assistant/conversations/{id}` (fetch conversation messages and recommendations).
    - `DELETE /api/v1/assistant/conversations/{id}` (delete thread).
    - `POST /api/v1/assistant/conversations/{id}/messages` (send prompt, get grounded recommendations).
  - *(Optional Upgrade)* `GET /api/v1/assistant/conversations/{id}/stream`: Server-Sent Events (SSE) streaming for real-time token rendering.

---

## Phase F6: Admin Panel & Management APIs

- [ ] **F6-S1: Admin audit logger** `feat(admin)`
  - `AuditLogger` service: Record mutating actions to `admin_activity_logs` (user ID, action, model, subject ID, before/after changes JSON, IP, User-Agent).
  - `GET /api/v1/admin/activity-logs`: Paginated log viewer with filter by action, user, date range.

- [ ] **F6-S2: Admin dashboard & AI usage analytics** `feat(admin)`
  - `GET /api/v1/admin/dashboard`: Aggregate KPI tiles (total products, active reviews, pending moderation count, AI tokens spent today, registered users).
  - `GET /api/v1/admin/ai/usage`: Aggregated time-series data for AI requests, token usage, latency distribution, and error rates.

- [ ] **F6-S3: Category & spec definition CRUD** `feat(admin)`
  - `apiResource` routes for `/api/v1/admin/categories` (create, update, delete, reorder).
  - `apiResource` routes for `/api/v1/admin/categories/{category_id}/specs` (define spec fields, data types, units, `higher_is_better`, filterable flags).

- [ ] **F6-S4: Brand & product management** `feat(admin)`
  - `apiResource` routes for `/api/v1/admin/brands`.
  - `apiResource` routes for `/api/v1/admin/products` (full CRUD, soft delete, restore, include trashed filter).
  - `PATCH /api/v1/admin/products/bulk-status` (bulk activate/deactivate/publish).
  - Product images API:
    - Multi-part file upload, validation (MIME type, size), WebP conversion, storage on disk.
    - Reorder images (`PATCH /api/v1/admin/products/{id}/images/reorder`).
    - Delete image (`DELETE /api/v1/admin/products/{id}/images/{imageId}`).

- [ ] **F6-S5: User management & review moderation queue** `feat(admin)`
  - `GET /api/v1/admin/users`: List users with role and status filtering.
  - `PATCH /api/v1/admin/users/{id}`: Update user role (`customer`/`admin`) or active status.
  - `GET /api/v1/admin/reviews`: Moderation queue (filter by `pending`, `approved`, `rejected`).
  - `PATCH /api/v1/admin/reviews/{id}` & `PATCH /api/v1/admin/reviews/bulk-status`: Approve/reject reviews.
  - Auto-trigger AI review summary regeneration on status transition.
  - `POST /api/v1/admin/products/{id}/regenerate-summary`: Manual admin trigger to refresh product summary.

---

## Phase F7: Verification, Testing & OpenAPI Validation

- [ ] **F7-S1: Unit & service test suite** `test(services)`
  - Pytest tests for `ValueScoreCalculator` (verifying mathematical edge cases).
  - Pytest tests for `CompareMatrixBuilder` (row winners, difference filtering).
  - Pytest tests for `AssistantService` grounding & hallucination prevention.
  - Pytest tests for `AiQuotaService` Redis token bucket rate limiting.

- [ ] **F7-S2: Feature & API endpoint test suite** `test(features)`
  - Replicate all 40+ test scenarios from Laravel's Pest/PHPUnit test suite:
    - Auth & CSRF (`AuthEndpointsTest`, `AuthorizationScaffoldTest`, `AuthThrottlingTest`).
    - Catalog & Search (`ProductSearchEndpointsTest`, `PostgresProductSearchTest`, `CatalogCategoryEndpointsTest`).
    - Compare & Wishlist (`CompareEndpointTest`, `CompareVerdictEndpointTest`, `WishlistEndpointsTest`).
    - Assistant & AI (`AssistantConversationTest`, `AssistantServiceTest`, `AiQuotaTest`).
    - Admin CRUD & Security (`AdminProductTest`, `SecurityHardeningTest`, etc.).

- [ ] **F7-S3: OpenAPI contract validation** `test(openapi)`
  - Generate OpenAPI schema from FastAPI (`app.openapi()`).
  - Verify 100% route and schema compatibility with `docs/openapi.yaml` and `docs/openapi.json`.

- [ ] **F7-S4: End-to-end integration with React frontend** `test(e2e)`
  - Run Vite frontend against the FastAPI backend through Nginx.
  - Verify complete user flows: register -> login -> search with faceted filters -> view detail -> add to wishlist -> compare products -> get AI verdict -> chat with AI assistant -> admin dashboard & moderation.
  - Confirm zero console errors, correct cookie handling, and accurate UI feedback.

---

## Phase F8: Production Hardening, CI/CD & Documentation

- [ ] **F8-S1: Production Dockerfile & Gunicorn/Uvicorn configuration** `chore(docker)`
  - Optimized production image with multi-stage build.
  - Process manager: Gunicorn with Uvicorn worker class (`uvicorn.workers.UvicornWorker`).
  - Worker concurrency tuning based on CPU cores.

- [ ] **F8-S2: GitHub Actions CI workflow** `ci`
  - Setup `.github/workflows/ci.yml` Python job:
    - Linting with `ruff check .`
    - Formatting check with `ruff format --check .`
    - Type check with `mypy app`
    - Test execution with `pytest --cov=app tests/`
  - Continue running frontend linting and build checks.

- [ ] **F8-S3: Documentation & ADR update** `docs`
  - Create Architecture Decision Record (`ADR-008: Migration from Laravel to FastAPI`).
  - Update `README.md` architecture diagram, badges, and local development instructions.
  - Document migration guidelines and cutover steps.
