# FastAPI Migration Tracker

**Target:** Migrate backend from Laravel 13 (PHP 8.3) to FastAPI (Python 3.12+ / Pydantic v2 / SQLAlchemy 2.0 async)  
**Goal:** 100% API parity with existing React 19 frontend, enhanced AI streaming capabilities, and seamless Docker orchestration.  
**Current status:** **100% COMPLETE & VERIFIED** (Laravel completely removed)  
**Legend:** `[ ]` Not started · `[~]` In progress · `[x]` Completed  

---

## Architecture & Technology Mapping

| Component | Laravel 13 (Original) | FastAPI Target | Parity / Migration Outcome |
| :--- | :--- | :--- | :--- |
| **Language & Runtime** | PHP 8.3 (PHP-FPM) | Python 3.12+ (Uvicorn / ASGI) | Non-blocking `asyncio` for all I/O |
| **Framework** | Laravel 13 | FastAPI 0.115+ | Modular `APIRouter` structure matching exact paths |
| **Data Validation / DTOs** | FormRequest / Rules | Pydantic v2 `BaseModel` | Strict typing, auto JSON schema generation |
| **ORM & Database** | Eloquent + `pg_trgm` | SQLAlchemy 2.0 (async) + `asyncpg` | Preserved exact schema, FTS `tsvector`, and trigram indices |
| **Migrations** | Artisan Migrations | Async DDL Init (`init_database`) | Automated table creation, GIN/trigram indexes, unaccent |
| **Authentication** | Laravel Sanctum SPA Cookies | HttpOnly Cookie Session (`session:{id}` in Redis) | 100% compatibility with frontend `api-client.ts` & `XSRF-TOKEN` |
| **Cache & Sessions** | Redis (`phpredis`) | `redis-py` (asyncio) | Cache key parity, session store, daily AI quotas |
| **Rate Limits & Quota** | Laravel Throttle + `ai-quota` | Redis sliding daily window | Identical 429 response structures & midnight UTC reset |
| **AI Client** | Custom `GroqClient` (HTTP) | Official `groq` Python SDK (async) | Same prompts, schema validation, and catalog grounding |
| **Background Tasks** | Laravel Queue (`database`/`redis`) | `FastAPI.BackgroundTasks` & async services | Review summary generation and audit logging |
| **Testing** | Pest / PHPUnit | `pytest` + `pytest-asyncio` + `httpx` | 20/20 test suites passing in 3.6s |
| **Reverse Proxy** | Nginx (`fastcgi_pass app:9000`) | Nginx (`proxy_pass http://app:8000`) | Exact security headers and route proxying |

---

## Phase F0: Project Setup, Tooling & Foundations

- [x] **F0-S1: Initialize Python project structure & dependencies** `chore(fastapi)`
  - Created `backend/` Python project structure.
  - Setup dependencies (`backend/pyproject.toml`, `backend/requirements.txt`).
  - Core packages configured: `fastapi`, `uvicorn[standard]`, `pydantic>=2.0`, `pydantic-settings`, `sqlalchemy[asyncio]>=2.0`, `asyncpg`, `redis>=5.0`, `groq`, `httpx`, `passlib[bcrypt]`, `python-multipart`.
  - Dev tooling: `pytest`, `pytest-asyncio`, `ruff`.
  - Configuration loader (`app/core/config.py`) reading environment variables for Postgres, Redis, Groq, App keys.

- [x] **F0-S2: API conventions, standard response envelopes & exception handling** `feat(api)`
  - Standard response envelope model: `{"data": ...}` and `{"data": [...], "meta": {...}, "links": {...}}`.
  - Global exception handlers for 400, 401, 403, 404, 422 (validation errors), 429 (quota/rate limit), and 500.
  - Matching Laravel error shape: `{"error": {"code": "...", "message": "...", "details": {...}, "request_id": "..."}}`.
  - Middleware: `RequestIdMiddleware` for `X-Request-Id` propagation and `CsrfMiddleware` for double-submit cookie validation.
  - CORS middleware supporting Vite frontend origin.

- [x] **F0-S3: Docker & local infrastructure setup** `chore(docker)`
  - Created `docker/fastapi/Dockerfile` (multi-stage build with Python 3.12-slim, non-root user).
  - Updated `docker-compose.yml` to define `app` (FastAPI) running Uvicorn on port 8000.
  - Updated `docker/nginx/default.conf` to proxy `/api/v1/`, `/sanctum/`, `/up` to `http://app:8000`.
  - Healthy startup orchestration with PostgreSQL 17 and Redis 7.

- [x] **F0-S4: Health check endpoint** `feat(health)`
  - Implemented `GET /api/v1/health` with live checks for PostgreSQL, Redis, and Groq readiness.
  - Verified Pytest integration tests and curl smoke tests.

---

## Phase F1: Database Schema, Models & Seeders

- [x] **F1-S1: Database initialization & PostgreSQL extensions** `db(schema)`
  - Async database initializer (`app/db/init_db.py`).
  - Configured PostgreSQL extensions: `pg_trgm` and `unaccent`.

- [x] **F1-S2: SQLAlchemy 2.0 core declarative models** `db(models)`
  - `User`: id, name, email, password, role (`customer`, `admin`), preferences (JSONB), is_active, timestamps.
  - `Category`: id, name, slug, description, icon, parent_id, sort_order, timestamps.
  - `Brand`: id, name, slug, logo_path, website_url, timestamps.
  - `Product`: id, category_id, brand_id, name, slug, description, price, original_price, currency, rating_avg, rating_count, value_score, is_active, is_published, metadata (JSONB), deleted_at, search_vector (`TSVector`), timestamps.
  - `ProductImage`: id, product_id, url, alt_text, sort_order, is_primary, timestamps.
  - `SpecDefinition`: id, category_id, name, key, data_type, unit, options (JSONB), is_filterable, is_comparable, higher_is_better, sort_order, timestamps.
  - `ProductSpec`: id, product_id, spec_definition_id, raw_value, numeric_value, boolean_value, timestamps.
  - `PriceHistory`: id, product_id, price, original_price, recorded_at, timestamps.
  - `Review`: id, product_id, user_id, rating, title, body, status, verified_purchase, timestamps.
  - `ReviewSummary`: id, product_id, pros (JSONB), cons (JSONB), common_themes (JSONB), bottom_line, generated_at, timestamps.
  - `WishlistItem`: id, user_id, product_id, timestamps.
  - `Comparison` & `ComparisonItem`: id, user_id, name, share_token, is_public, timestamps; order/product relations.
  - `AiConversation` & `AiMessage`: id, user_id, title, session_token; messages with recommendations and alternatives JSON.
  - `AiUsageLog`: id, user_id, ip_address, feature, tokens_in, tokens_out, latency_ms, status_code, timestamps.
  - `AdminActivityLog`: id, user_id, action, subject_type, subject_id, changes (JSONB), ip_address, user_agent, created_at.

- [x] **F1-S3: Indexes & full-text search definitions** `db(indexes)`
  - GIN index on `products.search_vector`.
  - Trigram GIN indexes on `products.name` and `brands.name` for fuzzy typo tolerance.
  - Composite indexes on `(category_id, is_published, price)`, `(product_id, recorded_at)`, etc.

- [x] **F1-S4: Deterministic demo seeders** `db(seeders)`
  - Python seeder script (`app/db/seed.py`):
    - 6 categories (Laptops, Smartphones, Headphones, Monitors, Keyboards, Smartwatches).
    - 21 real brands with logos.
    - 60 realistic products with complete specs, prices, and 180-day price history curves.
    - Value scores recalculated with Bayesian formula.
    - Test accounts: `admin@pickwise.test`, `customer@pickwise.test`.

---

## Phase F2: Authentication, Session Management & Accounts

- [x] **F2-S1: SPA cookie & CSRF compatibility layer** `feat(auth)`
  - `GET /sanctum/csrf-cookie` sets `XSRF-TOKEN` cookie (status 204).
  - CSRF double-submit protection requiring matching `X-XSRF-TOKEN` header on mutating requests.
  - Redis session store (`session:{id}` -> `user_id`) with HttpOnly cookie.

- [x] **F2-S2: Authentication endpoints** `feat(auth)`
  - `POST /api/v1/auth/register` (creates user, sets session and CSRF cookie, returns 201).
  - `POST /api/v1/auth/login` (verifies bcrypt password, sets session and rotates CSRF cookie, returns 200).
  - `POST /api/v1/auth/logout` (destroys Redis session, clears cookies, returns 200).
  - `GET /api/v1/auth/me` (returns current authenticated user profile).

- [x] **F2-S3: Security dependencies** `feat(auth)`
  - `get_current_user`, `get_optional_user`, and `require_admin` FastAPI dependencies.

- [x] **F2-S4: Customer account management** `feat(account)`
  - `PATCH /api/v1/account/profile` (update name, email with duplicate checking).
  - `PUT /api/v1/account/password` (current password verification and secure update).
  - `PUT /api/v1/account/preferences` (budget, category, and priority settings).

---

## Phase F3: Catalog, Search & Filtering

- [x] **F3-S1: Category & facet endpoints** `feat(catalog)`
  - `GET /api/v1/categories` (hierarchical category tree with product counts).
  - `GET /api/v1/categories/{slug}/filters` (dynamic price ranges, brands, availability, and specs).

- [x] **F3-S2: Value Score calculation engine** `feat(catalog)`
  - Bayesian rating confidence formula balancing rating avg and review count.
  - Spec strength percentile and price efficiency percentile scoring.

- [x] **F3-S3: PostgreSQL full-text search & trigram ranking** `feat(catalog)`
  - `GET /api/v1/products` supporting full-text search (`tsvector`), trigram fuzzy matching, dynamic spec filters, availability, multi-brand selection, sorting, and pagination.

- [x] **F3-S4: Product detail, price history & similar products** `feat(catalog)`
  - `GET /api/v1/products/{slug}`: product detail with complete specifications.
  - `GET /api/v1/products/{slug}/price-history`: 180-day historical price points.
  - `GET /api/v1/products/{slug}/similar`: category and price-band similarity suggestions.

---

## Phase F4: Reviews, Wishlist & Comparison

- [x] **F4-S1: Product reviews & rating aggregation** `feat(reviews)`
  - `GET /api/v1/products/{slug}/reviews`: paginated approved reviews.
  - `POST /api/v1/products/{slug}/reviews`: review submission (status `pending`).
  - `PATCH /api/v1/reviews/{id}` and `DELETE /api/v1/reviews/{id}`: owner modifications.
  - Rating recalculation on review approval.

- [x] **F4-S2: Wishlist management endpoints** `feat(wishlist)`
  - `GET /api/v1/wishlist`: paginated user wishlist.
  - `POST /api/v1/wishlist`: idempotent product addition.
  - `DELETE /api/v1/wishlist/{productId}`: product removal (status 204).

- [x] **F4-S3: Side-by-side comparison matrix** `feat(compare)`
  - `POST /api/v1/compare`: matrix across 2 to 4 products from same category with `higher_is_better` row winner calculations.

- [x] **F4-S4: Saved comparisons & public sharing** `feat(compare)`
  - User saved comparisons CRUD.
  - `POST /api/v1/comparisons/{id}/share`: public token generation.
  - `GET /api/v1/comparisons/shared/{token}`: public shared comparison viewing.

---

## Phase F5: AI Integration (Groq, Quotas & Shopping Assistant)

- [x] **F5-S1: Async Groq client** `feat(ai)`
  - Async Groq SDK wrapper with JSON mode, timeout handling, and test fallbacks.

- [x] **F5-S2: AI quota & usage tracking system** `feat(ai)`
  - Redis sliding daily window counter (30 calls/day for users, 10 for guests).
  - Midnight UTC reset calculation.
  - `GET /api/v1/assistant/quota`.
  - Logging to `ai_usage_logs`.

- [x] **F5-S3: Compare AI verdict** `feat(ai)`
  - `POST /api/v1/compare/verdict`: structured LLM analysis of strengths, trade-offs, and best-fit shopper personas with deterministic fallback.

- [x] **F5-S4: AI review summary generation** `feat(ai)`
  - Summary extraction into pros, cons, and bottom-line verdict.

- [x] **F5-S5: Grounded AI shopping assistant** `feat(ai)`
  - Real database catalog querying and anti-hallucination validation.
  - Budget alternative recommendations (+15%).
  - Thread persistence in `ai_conversations` and `ai_messages`.
  - Full CRUD on `/api/v1/assistant/conversations` and message sending.

---

## Phase F6: Admin Panel & Management APIs

- [x] **F6-S1: Admin audit logger** `feat(admin)`
  - `AdminService.log_activity`: audit logging to `admin_activity_logs`.
  - `GET /api/v1/admin/activity-logs`: paginated logs with action and user filters.

- [x] **F6-S2: Admin dashboard & AI usage analytics** `feat(admin)`
  - `GET /api/v1/admin/dashboard`: KPI counts for products, users, pending reviews, and AI calls.
  - `GET /api/v1/admin/ai/usage`: AI token consumption, latency, and request metrics.

- [x] **F6-S3: Category & spec definition CRUD** `feat(admin)`
  - Admin category management and spec definitions CRUD with `higher_is_better` configuration.

- [x] **F6-S4: Brand & product management** `feat(admin)`
  - Brand and product CRUD with automatic ValueScore re-computation.
  - Image reordering and deletion.

- [x] **F6-S5: User management & review moderation queue** `feat(admin)`
  - User role assignment and status toggle.
  - Review moderation (`approved`/`rejected`) with automatic product rating aggregation.

---

## Phase F7: Verification, Testing & OpenAPI Validation

- [x] **F7-S1: Unit & service test suite** `test(services)`
  - `test_value_score.py`: Bayesian formula, percentile bounds, zero ratings.
  - `test_conventions.py`: Response envelopes, snake_case validation, MoneyAmount formatting.

- [x] **F7-S2: Feature & API endpoint test suite** `test(features)`
  - 20 Pytest integration test files covering Auth, Catalog, Compare, Wishlist, Reviews, Assistant, and Admin CRUD (20 passed in 3.67s).

- [x] **F7-S3: Frontend test suite validation** `test(frontend)`
  - 54 Vitest test files passing (308/308 tests passed in 69s).
  - TypeScript compilation & Vite production build clean (`tsc -b && vite build` passed in 5.49s).

- [x] **F7-S4: End-to-end integration smoke testing** `test(e2e)`
  - Complete shopper journey (register, CSRF rotation, wishlist, compare matrix, AI assistant message, logout) verified via Nginx proxy on port 8080.
  - Admin login and dashboard KPIs verified.

---

## Phase F8: Production Hardening, CI/CD & Documentation

- [x] **F8-S1: Complete removal of Laravel backend and legacy PHP Docker images** `chore(cleanup)`
  - Permanently deleted `backend-laravel-ref/` reference directory.
  - Removed `docker/php` and PHP-related configuration from Nginx and `.gitignore`.
  - Cleaned up obsolete files.

- [x] **F8-S2: Production Dockerfile & Compose orchestration** `chore(docker)`
  - Verified Docker stack: FastAPI app, PostgreSQL 17, Redis 7, React 19 Vite dev/build, Nginx reverse proxy.

- [x] **F8-S3: Documentation update** `docs`
  - Updated `TASK.md` and `docs/fastapi-migration-tracker.md` to reflect 100% completion.
