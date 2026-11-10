# Pickwise: Project Overview

> Read this file first. It defines **what** we are building and **why**. Everything else in `/docs` defines **how**.

## 1. Product in one paragraph

**Pickwise** is an AI-powered shopping decision platform that helps people decide *what to buy*, not just browse. Users search a structured catalog, compare products side by side, read AI summaries of customer reviews, and talk to an AI assistant that turns "I need a laptop for video editing under ₹90,000" into a short list of products with plain-language reasons.

Pickwise is a **decision** tool. It does not process payments or orders. Each product page ends with an outbound "View on store" link (see `Non-goals`).

## 2. Goals

| # | Goal | Success looks like |
|---|------|--------------------|
| 1 | Simplify product discovery | Search, filters, sorting and rich product pages work fast and feel effortless |
| 2 | Intelligent recommendations | The assistant returns grounded, budget-respecting picks with reasons |
| 3 | Product comparison | 2–4 products compared in one view with an AI verdict |
| 4 | Review intelligence | Each product has an AI summary of pros, cons and common themes |
| 5 | Budget-based assistance | Budget is a hard constraint; over-budget requests get alternatives |
| 6 | Personalisation | Accounts, wishlist, saved comparisons, AI chat history, saved preferences |
| 7 | Admin management | Admin dashboard for catalog, users, review moderation, AI usage, audit log |
| 8 | Security & maintainability | Role-based access, validated input, safe AI key handling, graceful AI failure, tests |

## 3. Personal goals (why this project exists)

This is a **learning and portfolio project**. Therefore:

- Every architectural decision should be explainable in an interview.
- Prefer clean, conventional, well-tested code over clever code.
- The README, screenshots, a live demo, and a short architecture write-up are part of the deliverable.
- Depth beats breadth: a polished, reliable AI integration is worth more than ten half-working features.

## 4. Tech stack (STRICT: no substitutions)

| Layer | Technology | Role |
|-------|-----------|------|
| Backend | **Laravel 13** | REST API, business logic, auth, queues |
| Frontend | **React.js** | SPA |
| UI components | **shadcn/ui** | Accessible, owned component source |
| Styling | **Tailwind CSS** | Utility styling and design tokens |
| Database | **PostgreSQL** | Primary data store |
| Cache & queue | **Redis** | Cache, queue, sessions, rate limiting, daily AI counters |
| AI | **Groq API** | LLM inference |
| Environment | **Docker** | Reproducible dev environment |
| VCS | **Git & GitHub** | Version control, PRs, CI |

### Supporting libraries (allowed, not stack changes)

These are tooling and ecosystem libraries that the chosen stack effectively requires. Anything not listed here needs explicit approval before being added.

- **Frontend:** Vite (bundler), TypeScript, React Router, TanStack Query, React Hook Form + Zod, Lucide icons, Recharts (shadcn charts), Framer Motion (sparingly, see `ui-context.md`), Vitest + Testing Library (frontend tests), `@fontsource` packages (self-hosted fonts), Playwright (optional, only at P8-S7).
- **Backend:** Laravel Sanctum (SPA auth), phpredis (PHP extension for Redis; Predis only if the extension causes problems), Pest (testing), Laravel Pint (formatting), Larastan (static analysis).
- **Tooling:** ESLint, Prettier, GitHub Actions.

> If a library is not in this list and is not part of Laravel/React/shadcn/Tailwind themselves, **ask first**.

## 5. Scope

### In scope (MVP)

1. Auth (register, login, logout, profile) with `customer` and `admin` roles.
2. Catalog: categories, brands, products, images, structured specs, availability.
3. Search, filter (price, category, brand, rating, specs), sort, pagination.
4. Product detail page with specs, images, reviews, AI review summary.
5. Reviews: customers write reviews; admins moderate.
6. Compare: pick 2–4 products, spec diff table, AI verdict, save comparison.
7. AI shopping assistant: natural language, budget-aware, grounded in the catalog, saved history.
8. Wishlist.
9. Admin dashboard: catalog CRUD, users, review moderation, AI usage, audit log.

### Elevation features (what takes this "to the next level")

These are the features that separate a tutorial project from a portfolio piece. Build after the MVP is stable.

| Feature | Why it impresses |
|---------|------------------|
| **Database-grounded AI prompts** (the AI only sees real products from our DB) | Prevents made-up products; simple to explain |
| **JSON replies from the AI, checked in code** | Lets the UI show real product cards safely |
| **Daily AI limit per user** (Redis counter) | Protects the free API quota; simple and fast |
| **Redis for cache, queues and rate limiting** | Shows you know when to use a cache and background workers |
| **Value Score** (transparent formula combining price, specs, rating) | Original, explainable, demo-able |
| **Price history chart** | Data visualisation on real tables |
| **PostgreSQL full-text search + `pg_trgm` typo tolerance** | Uses Postgres properly |
| **Admin audit log + AI usage analytics** | Accountability and observability |
| **CI pipeline + test suite + OpenAPI-style API docs** | Engineering maturity |

### Non-goals

- No cart, checkout, payments or order management.
- No real-time scraping of live retailer data (use seeded catalog data).
- No mobile native app.
- No multi-language support in MVP.
- No vector database, embeddings, model training or other advanced AI techniques. AI is **API integration only** (prompt in, JSON out).

## 6. Users

| Role | Needs |
|------|-------|
| **Visitor** | Browse, search, compare, read summaries. Limited AI use (optional, throttled) |
| **Customer** | Everything above + wishlist, saved comparisons, reviews, AI history, preferences |
| **Admin** | Manage catalog, users, reviews; see AI usage and audit trail |

## 7. Core user journeys

1. **"Help me choose"**: Open assistant, describe need and budget, receive 3 ranked picks with reasons, open one, add to compare.
2. **"A or B?"**: Select 3 products, open compare, read the AI verdict, save the comparison.
3. **"Can I trust the reviews?"**: Open a product, read pros, cons and themes at a glance, scan raw reviews.
4. **"Just browsing"**: Search "gaming mouse", filter under ₹3,000, sort by rating, wishlist two items.
5. **Admin**: Add a product with specs and images, then moderate a flagged review.

## 8. Definition of done (per feature)

A feature is done when all of these are true:

- [ ] Works end to end (UI → API → DB) and handles loading, empty and error states.
- [ ] Validated input, authorised access, no secrets in code.
- [ ] Tests written and passing (see `code-standards.md`).
- [ ] Lint, format and static analysis clean.
- [ ] Matches `ui-context.md`; keyboard accessible; responsive.
- [ ] `progress-tracker.md` updated and the step committed.

## 9. Documentation map

| File | Purpose |
|------|---------|
| `project-overview.md` | This file: scope and goals |
| `architecture-context.md` | System design, folders, Docker, auth, request flow |
| `database-schema.md` | Tables, columns, indexes, relationships |
| `api-spec.md` | REST endpoints and response conventions |
| `ai-integration.md` | Simple Groq integration, safety checks, daily limit, errors |
| `ui-context.md` | Design system, tokens, components, page blueprints |
| `code-standards.md` | Conventions, testing, security rules |
| `ai-workflow-rules.md` | Rules for any AI coding assistant working on this repo |
| `git-workflow.md` | Branching, commits, PRs, per-step commit protocol |
| `progress-tracker.md` | Phased roadmap and live status |
| `feature-specs/` | One spec per feature: requirements, edge cases, acceptance criteria |
