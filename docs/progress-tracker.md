# Progress Tracker

**Current phase:** P4, Wishlist & comparison
**Current step:** P4-S2
**Last updated:** 2026-11-13 (P4-S2)

Legend: `[ ]` not started · `[~]` in progress · `[x]` done and committed
Rule: **one step = one commit** (see `git-workflow.md`). Each feature's requirements live in `feature-specs/` (see its README for the step-to-spec map). Step IDs are used in commit footers (`Refs P2-S4`).

---

## P0: Foundation (branch `phase/P0-foundation`)
- [x] **P0-S1** Initialise Git repo, `.gitignore`, README stub, copy `/docs` · `chore(docs)`
- [x] **P0-S2** Docker: PHP-FPM, Nginx, PostgreSQL, Redis, Node services, `docker-compose.yml` · `chore(docker)`
- [x] **P0-S3** Create Laravel 13 app in `backend/`, connect to Postgres, health endpoint · `chore(backend)`
- [x] **P0-S4** Enable `pg_trgm` and `unaccent` extensions via migration · `chore(db)`
- [x] **P0-S5** Add Redis: phpredis in PHP image, set session/queue/cache to Redis, connection health check · `chore(redis)`
- [x] **P0-S6** Create React + Vite + TypeScript app in `frontend/`, Nginx proxy `/api` · `chore(frontend)`
- [x] **P0-S7** Tailwind CSS + shadcn/ui init, design tokens (light and dark), fonts · `feat(ui)`
- [x] **P0-S8** Tooling: Pint, Larastan, Pest, ESLint, Prettier, Vitest · `chore(tooling)`
- [x] **P0-S9** GitHub Actions CI (lint, analyse, test, build) · `ci`
- [x] **P0-S10** API conventions: response envelope, exception handler, request ID · `feat(api)`

## P1: Authentication & accounts (branch `phase/P1-auth`)
- [x] **P1-S1** `users` migration with role, preferences, is_active; `UserRole` enum · `db(auth)`
- [x] **P1-S2** Sanctum SPA auth: register, login, logout, me (+ tests) · `feat(auth)`
- [x] **P1-S3** Login throttling, `role` middleware, policies scaffold · `feat(auth)`
- [x] **P1-S4** Frontend API client (CSRF + error normalisation), auth provider and guards · `feat(auth)`
- [x] **P1-S5** Login and register pages (React Hook Form + Zod) · `feat(auth)`
- [x] **P1-S6** App shell: header, navigation, theme toggle, footer, route layouts · `feat(ui)`
- [x] **P1-S7** Profile, change password, preferences endpoints and page · `feat(account)`

## P2: Catalog & discovery (branch `phase/P2-catalog`)
- [x] **P2-S1** Migrations: categories, brands, products, images · `db(catalog)`
- [x] **P2-S2** Migrations: spec_definitions, product_specs, price_history · `db(catalog)`
- [x] **P2-S3** Models, relationships, factories · `feat(catalog)`
- [x] **P2-S4** Deterministic showcase seeders (6 categories, ~60 products, specs, history) · `db(catalog)`
- [x] **P2-S5** `GET /categories` and category filter facets · `feat(catalog)`
- [x] **P2-S6** `GET /products` search, filters, sorting, pagination (+ tests) · `feat(catalog)`
- [x] **P2-S7** Postgres full-text search + trigram typo tolerance · `feat(catalog)`
- [x] **P2-S8** `GET /products/{slug}` with Resources · `feat(product)`
- [x] **P2-S9** FE: `ProductCard`, `PriceTag`, `RatingStars`, skeletons · `feat(ui)`
- [x] **P2-S10** FE: catalog page with `FilterPanel`, URL-synced filters, pagination · `feat(catalog)`
- [x] **P2-S11** FE: product detail page (gallery, specs, availability) · `feat(product)`
- [x] **P2-S12** FE: global search with command palette and suggestions · `feat(catalog)`
- [x] **P2-S13** Value Score service + tests, show on cards and detail · `feat(catalog)`
- [x] **P2-S14** Price history endpoint and chart · `feat(product)`
- [x] **P2-S15** Similar products endpoint and section · `feat(product)`

## P3: Reviews (branch `phase/P3-reviews`)
- [x] **P3-S1** Reviews migration, model, policy, rating aggregates · `db(review)`
- [x] **P3-S2** List reviews + create/update/delete own review (+ tests) · `feat(review)`
- [x] **P3-S3** Seed realistic reviews (mixed sentiment) · `db(review)`
- [x] **P3-S4** FE: rating distribution, review list, review form · `feat(review)`

## P4: Wishlist & comparison (branch `phase/P4-compare`)
- [x] **P4-S1** Wishlist endpoints (+ tests) · `feat(wishlist)`
- [x] **P4-S2** FE: wishlist toggle (optimistic) and account wishlist tab · `feat(wishlist)`
- [ ] **P4-S3** Compare matrix endpoint (spec rows, per-row winner using `higher_is_better`) · `feat(compare)`
- [ ] **P4-S4** FE: `CompareTray` (2 to 4 items, persists across navigation) · `feat(compare)`
- [ ] **P4-S5** FE: compare page, `CompareMatrix`, "differences only" toggle · `feat(compare)`
- [ ] **P4-S6** Saved comparisons: tables, endpoints, account tab, share link · `feat(compare)`

## P5: AI features (branch `phase/P5-ai`)
- [ ] **P5-S1** `config/ai.php` and `GroqClient` (timeout, JSON reply, clear exceptions) · `feat(ai)`
- [ ] **P5-S2** `FakeGroqClient` for tests · `test(ai)`
- [ ] **P5-S3** `ai_usage_logs` table, daily limit middleware (Redis counter), `GET /assistant/quota` · `feat(ai)`
- [ ] **P5-S4** Review summary: table, service, queued job on approval, endpoint · `feat(ai)`
- [ ] **P5-S5** FE: `ReviewSummaryCard` on product page · `feat(ai)`
- [ ] **P5-S6** Assistant service: fetch products by budget/category, build prompt, parse JSON, check product ids, fallback · `feat(assistant)`
- [ ] **P5-S7** Conversations and messages tables + endpoints · `feat(assistant)`
- [ ] **P5-S8** FE: assistant page (thread, recommendation cards, loading, error, quota counter) · `feat(assistant)`
- [ ] **P5-S9** FE: `VerdictPanel` component with all states · `feat(ui)`
- [ ] **P5-S10** Compare explanation endpoint (strengths, weaknesses, verdict) · `feat(compare)`
- [ ] **P5-S11** FE: verdict on the compare page · `feat(compare)`

## P6: Personalisation & home (branch `phase/P6-personalisation`)
- [ ] **P6-S1** Home hero connected to the assistant, with example prompts · `feat(ui)`
- [ ] **P6-S2** Add saved user preferences (budget, favourite categories) to the assistant prompt · `feat(assistant)`
- [ ] **P6-S3** Account page: conversation history tab · `feat(account)`

## P7: Admin (branch `phase/P7-admin`)
- [ ] **P7-S1** `admin_activity_logs` + `AuditLogger` service · `feat(admin)`
- [ ] **P7-S2** Admin layout, dashboard endpoint and KPI tiles · `feat(admin)`
- [ ] **P7-S3** Category and spec definition management · `feat(admin)`
- [ ] **P7-S4** Brand and product CRUD (API) · `feat(admin)`
- [ ] **P7-S5** Image upload, reorder, delete (validated, private disk or storage link) · `feat(admin)`
- [ ] **P7-S6** FE: product management tables and forms · `feat(admin)`
- [ ] **P7-S7** User management (activate/deactivate, role) · `feat(admin)`
- [ ] **P7-S8** Review moderation queue + triggers summary regeneration · `feat(admin)`
- [ ] **P7-S9** AI usage analytics endpoint and charts · `feat(admin)`
- [ ] **P7-S10** Audit log viewer with filters · `feat(admin)`

## P8: Elevation & polish (branch `phase/P8-polish`)
- [ ] **P8-S1** Polish AI screens: loading, error and empty states · `fix(ui)`
- [ ] **P8-S2** Performance pass: indexes review (`EXPLAIN`), eager loading, caching facets in Redis · `perf`
- [ ] **P8-S3** Accessibility audit and fixes (keyboard, contrast, screen reader) · `fix(ui)`
- [ ] **P8-S4** Dark mode verification across all screens · `fix(ui)`
- [ ] **P8-S5** Responsive pass (320px to 1440px) · `fix(ui)`
- [ ] **P8-S6** Security review against `code-standards.md` §4, add security headers · `chore(security)`
- [ ] **P8-S7** Playwright E2E for key journeys (optional) · `test`
- [ ] **P8-S8** OpenAPI-style API docs generated or hand-written · `docs`

## P9: Release (branch `phase/P9-release`)
- [ ] **P9-S1** README: screenshots, architecture diagram, AI design notes; add MIT LICENSE · `docs`
- [ ] **P9-S2** Demo seed data and demo accounts · `db`
- [ ] **P9-S3** Production Docker config and deployment notes · `build`
- [ ] **P9-S4** Deploy a live demo (host of your choice; document in README) · `chore`
- [ ] **P9-S5** Short demo video + resume bullet points · `docs`
- [ ] **P9-S6** Tag `v1.0.0` · `chore`

---

## Blockers
- P2-S14/P2-S15 historical verification: backend Pest and PHPStan were blocked by inaccessible `backend/vendor/autoload.php` and `backend/phpstan.neon`. Frontend tests had auth/session shell failures at that time.
- P3-S1 verification: PHP syntax checks and Pint pass. Pest cannot open `backend/vendor/autoload.php`; PHPStan cannot read `backend/phpstan.neon`. Frontend lint, typecheck, 72 tests, and production build pass.
- P3-S2 verification: Pint and PHP syntax checks pass. Pest cannot open `backend/vendor/autoload.php`; PHPStan cannot read `backend/phpstan.neon`. Frontend lint, typecheck, 72 tests, and production build pass.
- P3-S3 verification: PHP syntax checks, Pint, and `git diff --check` pass. Pest cannot open `backend/vendor/autoload.php`, and PHPStan cannot read `backend/phpstan.neon`; seeder feature test remains unverified.
- P3-S4 verification: `backend/vendor` is available again. Pint and PHPStan pass (seven pre-existing findings fixed), full Pest passes (152 tests), frontend lint/typecheck/80 tests/production build pass, and `git diff --check` is clean.
- P4-S1 verification: Pint, PHPStan, and full Pest pass inside the `app` container (160 tests, 4625 assertions). Host PHP lacks the `redis` extension, so the Redis/health tests fail on the host; they pass in Docker. Frontend lint, typecheck, 80 tests, and production build pass. `git diff --check` is clean.
- P4-S2 verification: frontend lint, typecheck, 89 tests, and production build pass. This was a frontend-only step; Docker was not running and no backend files changed. `git diff --check` is clean.
- P4-S2 note: the spec's optional price-drop indicator is deferred because the wishlist API payload does not include the price at save time. Adding it needs a `saved_price` column (or a price-history lookup per item); tracked for a later polish step.

## Decisions log
Short entries go in `docs/decisions.md`.

## Learning log (optional but valuable)
One line per step on what you learned. Turns into interview material.

| Step | What I learned |
|------|----------------|
| | |

## Resume bullet drafts (refine at P9)
- Built a full-stack AI shopping decision platform (Laravel 13, React, PostgreSQL, Redis, Groq) that integrates an LLM API using **database-grounded prompts**, so recommendations only include real, in-budget products.
- Added **Redis-backed per-user daily limits, JSON reply validation and graceful fallbacks** for LLM calls, with the API key kept server-side and AI services covered by automated tests.
- Implemented Postgres full-text and trigram search, a transparent **Value Score** algorithm, role-based admin tools with an append-only audit log, and a CI pipeline with automated tests.
