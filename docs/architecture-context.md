# Architecture Context

## 1. High-level design

```
                    ┌────────────────────────────┐
                    │   Browser (React SPA)      │
                    │   React 19 · TS · Tailwind │
                    │   shadcn/ui · TanStack Q   │
                    └──────────────┬─────────────┘
                                   │ HTTPS (cookie auth, JSON)
                    ┌──────────────▼─────────────┐
                    │   Nginx (reverse proxy)    │
                    │   /      → SPA (Vite)      │
                    │   /api   → FastAPI         │
                    └──────────────┬─────────────┘
                                   │
        ┌──────────────────────────▼───────────────────────────┐
        │                  FastAPI Backend                     │
        │  Routes → Middleware → Dependency Injection          │
        │        → Service Layer → SQLAlchemy 2.0 (async)      │
        │                                                      │
        │  AI services: Fetch products → Prompt → Groq → Check │
        └───────┬───────────────────────┬──────────────────────┘
                │                       │
      ┌─────────▼────────┐    ┌─────────▼──────────┐
      │   PostgreSQL 17  │    │     Groq API       │
      │ data · FTS GIN   │    │ (server-side only) │
      └──────────────────┘    └────────────────────┘
      ┌──────────────────┐
      │     Redis 7      │
      │ cache · sessions │
      │ AI daily quotas  │
      └──────────────────┘
```

**Key decisions**

| Decision | Choice | Reason |
|----------|--------|--------|
| Frontend ↔ backend | Separate React SPA + FastAPI REST API | Strict RESTful architecture with 100% frontend contract parity |
| Auth | Cookie-based session (`session:{id}` in Redis) | Secure by default (`HttpOnly`, `SameSite=Lax`, CSRF double-submit token), zero tokens in JS |
| Same origin | Nginx serves SPA and proxies `/api` & `/sanctum` | Eliminates CORS and cookie domain mismatches in dev and production |
| Cache, sessions & quotas | **Redis 7** | Sub-millisecond sessions, daily AI quotas, facet caching; PostgreSQL remains single source of truth |
| AI calls | Server-side only, behind async Services | API key never reaches browser; catalog grounding prevents hallucination |
| Heavy AI work | Background tasks (`FastAPI.BackgroundTasks`) | Keeps requests fast, non-blocking asynchronous event loop |
| Search | Postgres full-text (`tsvector`) + `pg_trgm` | Typo-tolerant relevance ranking with zero external search cluster overhead |

## 2. Repository layout (monorepo)

```
pickwise/
├── README.md
├── docker-compose.yml
├── docker/
│   ├── nginx/default.conf       # Reverse proxy, security headers, routing
│   ├── fastapi/Dockerfile       # Python 3.12-slim multi-stage ASGI build
│   └── node/Dockerfile          # Node.js container for React Vite dev/build
├── docs/                        # Architecture, schema, API spec, UI guide
├── backend/                     # FastAPI Application
│   ├── app/
│   │   ├── main.py              # FastAPI app factory, CORS, exception handlers
│   │   ├── core/
│   │   │   ├── config.py        # Pydantic Settings reading .env
│   │   │   ├── security.py      # Passlib bcrypt hashing, token generation
│   │   │   ├── auth.py          # Session management & security dependencies
│   │   │   ├── exceptions.py    # Standardized domain error classes
│   │   │   ├── middleware.py    # RequestIdMiddleware & CsrfMiddleware
│   │   │   └── response.py      # Generic ApiResponse, PaginatedResponse, MoneyAmount
│   │   ├── db/
│   │   │   ├── base.py          # SQLAlchemy DeclarativeBase
│   │   │   ├── session.py       # Async engine, sessionmaker, Redis async client
│   │   │   ├── init_db.py       # PG extensions, search vector triggers, GIN indexes
│   │   │   └── seed.py          # Deterministic seeder (6 categories, 60 products)
│   │   ├── models/              # SQLAlchemy 2.0 Async Declarative Models
│   │   │   ├── user.py, category.py, brand.py, product.py, spec_definition.py
│   │   │   └── review.py, wishlist.py, comparison.py, ai.py
│   │   ├── schemas/             # Pydantic v2 DTOs (Request / Response envelopes)
│   │   │   ├── user.py, catalog.py, reviews.py, wishlist.py, compare.py
│   │   │   └── assistant.py, admin.py
│   │   ├── services/            # Business & AI Services
│   │   │   ├── value_score.py   # Bayesian Value Score calculation engine
│   │   │   ├── search.py        # Catalog full-text search & facet queries
│   │   │   ├── reviews.py       # Review submissions & rating recalculations
│   │   │   ├── wishlist.py      # Wishlist operations
│   │   │   ├── compare.py       # Side-by-side spec matrix & share tokens
│   │   │   ├── quota.py         # Redis daily sliding quota tracking
│   │   │   ├── groq_client.py   # Async Groq SDK wrapper with fallback
│   │   │   ├── verdict.py       # Comparison AI verdict generator
│   │   │   ├── assistant.py     # Grounded shopping assistant with DB check
│   │   │   └── admin.py         # Admin management, metrics, audit logging
│   │   └── api/v1/              # Versioned API Routers
│   │       ├── router.py        # Root v1 APIRouter
│   │       └── endpoints/       # auth, catalog, compare, reviews, assistant, admin...
│   ├── tests/                   # Pytest async test suite
│   ├── pyproject.toml           # Project dependencies & pytest configuration
│   └── requirements.txt         # Pinned pip requirements
└── frontend/                    # React 19 SPA
    └── src/
        ├── features/            # auth, catalog, product, compare, assistant, wishlist, account, admin
        ├── components/          # shared and ui components (shadcn/ui)
        └── test/                # Vitest unit/component tests & Playwright specs
```

## 3. Backend layering rules

```
Request → CsrfMiddleware (validate) → APIRouter (route & params)
        → Pydantic Schema (validate payload) → Service (business logic)
        → SQLAlchemy 2.0 Async (Postgres query) → Pydantic Schema (shape) → JSON
```

- **Routers** only orchestrate: authenticate user via `Depends()`, call the matching Service, return an `ApiResponse` or `PaginatedResponse`.
- **Services** hold business logic, multi-step queries, transactions, and AI calls. Fully injectable and testable with mock sessions.
- **Pydantic Schemas** enforce strict type validation, coercion, and standard JSON envelope serialization.
- **SQLAlchemy Models** define database tables, foreign keys, relationships, and search vectors. Never leak raw models directly in API responses.
- **Zero Raw Queries Outside Services**: All queries use SQLAlchemy 2.0 select constructs with asyncpg.

## 4. Authentication & authorisation

1. SPA calls `GET /sanctum/csrf-cookie`, receiving a 204 No Content with `XSRF-TOKEN` cookie.
2. User submits credentials to `POST /api/v1/auth/login`.
3. Backend creates a secure 32-character session ID stored in Redis (`session:{session_id}` -> `user_id`), sets an `HttpOnly` session cookie (`pickwise_session`), and rotates the `XSRF-TOKEN` cookie.
4. Mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) require a matching `X-XSRF-TOKEN` header validated by `CsrfMiddleware`.
5. Dependencies:
   - `get_optional_user`: Resolves authenticated user if cookie is present; returns `None` for guests.
   - `get_current_user`: Raises HTTP 401 if not authenticated.
   - `require_admin`: Raises HTTP 403 if user role is not `admin`.

## 5. Data flow examples

### Assistant message

```
SPA → POST /api/v1/assistant/conversations/{id}/messages  { message, category? }
  → CsrfMiddleware validates XSRF token
  → Pydantic validates message payload
  → AssistantService:
      1. Check daily quota via AiQuotaService (Redis counter)
      2. Query PostgreSQL: matching products (category + keywords), top candidate products
      3. Build prompt with candidate products + user prompt
      4. Call Groq with JSON mode enabled (timeout 20s, graceful fallback)
      5. Strict DB validation: verify every recommended product_id exists in catalog
      6. Record message in ai_messages and log telemetry to ai_usage_logs
      7. Increment daily quota on success
  → Return ApiResponse[AssistantMessageOut] → SPA displays grounded recommendations
```

### Review summary

```
Review approved by Admin → AdminService triggers summary update
  → Query approved reviews (minimum 3 required)
  → Prompt Groq for structured pros, cons, common themes, and sentiment
  → Save record to review_summaries
Product detail page reads the saved summary. Zero AI latency on catalog view.
```

## 6. Docker environment

| Service | Image / purpose | Port |
|---------|-----------------|------|
| `nginx` | Reverse proxy: SPA + `/api` + `/sanctum` | 8080 |
| `app` | FastAPI (Python 3.12-slim / Uvicorn ASGI) | 8000 (internal proxy) |
| `db` | `postgres:17-alpine` with persistent volume | 5432 |
| `redis` | `redis:7-alpine` with persistent volume | 6379 |
| `web` | Node.js (React 19 Vite dev server with HMR) | 5173 |
| `mailpit` | Local SMTP / mail catcher | 8025 / 1025 |

## 7. Environment variables (backend)

```env
APP_ENV=local
SECRET_KEY=...
DB_HOST=db
DB_PORT=5432
DB_DATABASE=pickwise
DB_USERNAME=pickwise
DB_PASSWORD=pickwise
REDIS_HOST=redis
REDIS_PORT=6379
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_TIMEOUT_SECONDS=20
AI_DAILY_QUOTA_USER=30
AI_DAILY_QUOTA_GUEST=10
```

## 8. Testing layers

| Layer | Tool | Scope |
|-------|------|-------|
| Backend integration | `pytest` + `pytest-asyncio` | Full API routes, auth, catalog, AI quotas, admin CRUD |
| Frontend unit & component | `vitest` + React Testing Library | 308 tests across 54 test files (WCAG AA, responsive, dark mode) |
| E2E Journeys | `playwright` | Full shopper and admin end-to-end browser journeys |
