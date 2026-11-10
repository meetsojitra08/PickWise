# Architecture Context

## 1. High-level design

```
                    ┌────────────────────────────┐
                    │   Browser (React SPA)      │
                    │   Vite · TS · Tailwind     │
                    │   shadcn/ui · TanStack Q   │
                    └──────────────┬─────────────┘
                                   │ HTTPS (cookie auth, JSON)
                    ┌──────────────▼─────────────┐
                    │   Nginx (reverse proxy)    │
                    │   /      → SPA             │
                    │   /api   → Laravel         │
                    └──────────────┬─────────────┘
                                   │
        ┌──────────────────────────▼───────────────────────────┐
        │                    Laravel 13 API                    │
        │  Routes → Middleware → Controller → FormRequest      │
        │        → Action/Service → Eloquent → Resource        │
        │                                                      │
        │  AI services: Fetch products → Prompt → Groq → Check │
        └───────┬───────────────────────┬──────────────────────┘
                │                       │
      ┌─────────▼────────┐    ┌─────────▼──────────┐
      │   PostgreSQL     │    │     Groq API       │
      │ data · search    │    │ (server-side only) │
      └──────────────────┘    └────────────────────┘
      ┌──────────────────┐
      │      Redis       │
      │ cache · queue    │
      │ sessions · limits│
      └──────────────────┘
```

**Key decisions**

| Decision | Choice | Reason |
|----------|--------|--------|
| Frontend ↔ backend | Separate React SPA + Laravel REST API | Matches the stated "RESTful APIs" objective; clean separation to demonstrate |
| Auth | Laravel **Sanctum SPA cookie auth** | Secure by default (HttpOnly cookies, CSRF), no tokens in JS |
| Same origin | Nginx serves SPA and proxies `/api` | Avoids CORS and cookie pain in dev and prod |
| Queue / cache / sessions / rate limits | **Redis** | Fast, built for expiring data and background jobs; PostgreSQL stays the single source of truth |
| AI calls | Server-side only, behind Actions | API key never reaches the browser |
| Heavy AI work | Queued jobs (review summaries) | Keeps requests fast, allows retries |
| Search | Postgres full-text (`tsvector`) + `pg_trgm` | No Elasticsearch needed |

## 2. Repository layout (monorepo)

```
pickwise/
├── CLAUDE.md                  # Pointer to /docs for AI assistants
├── README.md
├── docker-compose.yml
├── .github/workflows/ci.yml
├── docker/
│   ├── nginx/default.conf
│   ├── php/Dockerfile
│   └── node/Dockerfile
├── docs/                      # This documentation
├── backend/                   # Laravel 13
│   ├── app/
│   │   ├── Actions/           # Single-purpose use cases (e.g. CreateReview)
│   │   ├── AI/
│   │   │   ├── GroqClient.php         # The only class that calls Groq
│   │   │   ├── AssistantService.php   # Fetch products → prompt → Groq → check
│   │   │   ├── CompareService.php
│   │   │   └── ReviewSummaryService.php
│   │   ├── Enums/             # UserRole, ReviewStatus, AiFeature...
│   │   ├── Http/
│   │   │   ├── Controllers/Api/V1/{Public,Customer,Admin}/
│   │   │   ├── Middleware/
│   │   │   ├── Requests/      # FormRequests (validation)
│   │   │   └── Resources/     # API Resources (response shape)
│   │   ├── Jobs/
│   │   ├── Models/
│   │   ├── Policies/
│   │   ├── Queries/           # Complex read queries (ProductSearchQuery)
│   │   └── Services/          # Cross-cutting (ValueScoreCalculator, AuditLogger)
│   ├── database/{migrations,factories,seeders}/
│   ├── routes/api.php
│   └── tests/{Feature,Unit,AI}/
└── frontend/                  # React SPA
    └── src/
        ├── app/               # Router, providers, layouts
        ├── components/
        │   ├── ui/            # shadcn/ui generated components
        │   └── shared/        # Project-level reusable components
        ├── features/          # Feature-first modules
        │   ├── auth/
        │   ├── catalog/
        │   ├── product/
        │   ├── compare/
        │   ├── assistant/
        │   ├── wishlist/
        │   ├── account/
        │   └── admin/
        │       each: api/ components/ hooks/ pages/ types/
        ├── lib/               # api client, utils, formatters
        ├── styles/            # globals.css, tokens
        └── types/
```

## 3. Backend layering rules

```
Request → FormRequest (validate) → Controller (thin) → Action/Service (logic)
        → Model/Query (data) → API Resource (shape) → JSON
```

- **Controllers** only orchestrate: authorise, call an Action, return a Resource.
- **Actions** hold business logic, one public `execute()` method, injectable, testable.
- **FormRequests** own validation and authorisation hooks.
- **Policies** own "can this user do that to this model".
- **API Resources** are the only way models become JSON. Never return a model directly.
- **No logic in routes or Blade.** There is no Blade UI.

## 4. Authentication & authorisation

1. SPA calls `GET /sanctum/csrf-cookie`, then `POST /api/v1/auth/login`.
2. Session cookie is `HttpOnly`, `SameSite=Lax`, `Secure` in production.
3. Roles: `customer`, `admin` (PHP backed enum on `users.role`).
4. Route groups: `public`, `auth:sanctum`, `auth:sanctum + role:admin`.
5. Policies for owned resources (wishlist, comparisons, conversations, reviews).
6. Frontend guards (`<RequireAuth>`, `<RequireAdmin>`) are **UX only**. The API is the real gate.
7. Rate limits: login (5/min per IP+email), AI endpoints (per-user and daily quota), review creation.

## 5. Data flow examples

### Assistant message

```
SPA → POST /api/v1/assistant/conversations/{id}/messages  { message, category?, budget_max? }
  → Request validation (message ≤ 500 chars)
  → Daily limit middleware
  → AssistantService
      1. Query PostgreSQL: matching products (budget + category), top ~12
      2. Build prompt with those products + the user's message
      3. Call Groq, ask for JSON
      4. Check: every product_id was in the list we sent, prices within budget
      5. Save messages + ai_usage_logs
  → Resource → SPA shows recommendation cards
```

### Review summary

```
Review approved → queued job
  → needs ≥ 3 approved reviews
  → send reviews to Groq, ask for JSON {summary, pros, cons, sentiment}
  → save to review_summaries
Product page reads the saved summary. No AI call while the page loads.
```

Full detail lives in `ai-integration.md`.

### What Redis is used for (and not used for)

| Use | How |
|-----|-----|
| Cache | Category tree, filter facets, popular products (always with a TTL) |
| Queue | Review summary jobs and other background work (`queue` container runs the worker) |
| Sessions | Sanctum session cookies map to Redis sessions |
| Rate limiting | Laravel `throttle` middleware uses the cache store |
| Daily AI limit | Counter key `ai:quota:{user_or_session}:{YYYY-MM-DD}` with expiry at midnight |

**Never** keep the only copy of important data in Redis. The source of truth is always PostgreSQL. If Redis is wiped, the app must still work (caches rebuild, counters restart).

## 6. Docker environment

| Service | Image / purpose | Port |
|---------|-----------------|------|
| `nginx` | Reverse proxy: SPA + `/api` | 8080 |
| `app` | PHP-FPM 8.3+ (Laravel 13) | internal |
| `queue` | Same image, `php artisan queue:work` | n/a |
| `scheduler` | Same image, `php artisan schedule:work` | n/a |
| `db` | `postgres:16+` with volume | 5432 |
| `redis` | `redis:7-alpine` (current stable) with volume | 6379 |
| `web` | Node, Vite dev server (HMR) | 5173 |
| `mailpit` | Local mail catcher | 8025 |

Rules:

- One command to start: `docker compose up -d`. One command to seed: `docker compose exec app php artisan migrate:fresh --seed`.
- `.env.example` is committed. `.env` is never committed.
- Verify the minimum PHP version in the Laravel 13 docs and pin it in `docker/php/Dockerfile`. Install the `redis` PHP extension (phpredis) in that Dockerfile.
- Enable `pg_trgm` and `unaccent` extensions via a migration.

## 7. Environment variables (backend)

```
APP_ENV, APP_KEY, APP_URL
DB_CONNECTION=pgsql, DB_HOST=db, DB_PORT=5432, DB_DATABASE, DB_USERNAME, DB_PASSWORD
REDIS_CLIENT=phpredis, REDIS_HOST=redis, REDIS_PORT=6379, REDIS_PASSWORD=null
SESSION_DRIVER=redis, QUEUE_CONNECTION=redis, CACHE_STORE=redis
SANCTUM_STATEFUL_DOMAINS=localhost:8080
GROQ_API_KEY=            # secret, server only
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=              # configurable, check Groq docs for current model ids
GROQ_TIMEOUT_SECONDS=20
AI_DAILY_QUOTA_USER=30
AI_DAILY_QUOTA_GUEST=5
```

AI settings are read only through `config/ai.php`, never via `env()` in application code.

## 8. Error handling strategy

- API returns a consistent error envelope (see `api-spec.md`).
- Validation → `422`, auth → `401/403`, missing → `404`, throttled → `429`, AI down → `503` with a friendly code (`ai_unavailable`).
- Groq failures never produce a 500 for the user: retry once with backoff, then degrade gracefully (the assistant falls back to deterministic search results with a notice).
- Every unexpected exception is logged with request ID; never leak stack traces in production.

## 9. Performance notes

- Eager load relations; forbid lazy loading in non-production (`Model::preventLazyLoading()`).
- Index every filter, sort and foreign key column (see `database-schema.md`).
- Paginate everything (cursor or page-based). Default 24 per page.
- Cache catalog aggregates (category tree, filter facets) in Redis with a short TTL; clear them when the admin changes the catalog.
- Frontend: route-level code splitting, image `loading="lazy"` with fixed aspect ratios, TanStack Query caching.

## 10. Testing layers

| Layer | Tool | Scope |
|-------|------|-------|
| Backend unit | Pest | Services, Value Score, validators |
| Backend feature | Pest | Every endpoint: success, validation, authorisation |
| AI tests | Pest + fake Groq client | AI services with prepared replies (valid, invalid, timeout) |
| Frontend | Vitest + Testing Library | Critical components and hooks |
| E2E (optional) | Playwright | Assistant, compare, wishlist journeys |

If Playwright and Vitest are used, add them under "Supporting libraries" in `project-overview.md`.
