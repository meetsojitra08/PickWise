# Pickwise

An AI-powered shopping decision platform that helps people decide *what to buy* — with structured catalog search, side-by-side product comparisons, AI review summaries, and a budget-aware shopping assistant grounded strictly in real database products.

> **Status:** Foundation (`P0`) in progress. Detailed architecture, specifications, and build steps live in [`docs/`](./docs/README.md).

## Tech Stack

- **Backend:** Laravel 13 (REST API), Laravel Sanctum (SPA cookie auth)
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query
- **Database & Cache:** PostgreSQL (`tsvector` + `pg_trgm`), Redis (cache, queue, sessions, rate limits, daily AI quotas)
- **AI:** Groq API (server-side only, database-grounded prompts, JSON validation)
- **Tooling & Infra:** Docker, Pest, Laravel Pint, Larastan, ESLint, Prettier, Vitest, GitHub Actions

## Documentation

- [Documentation Index](./docs/README.md)
- [Project Overview](./docs/project-overview.md)
- [Architecture Context](./docs/architecture-context.md)
- [Database Schema](./docs/database-schema.md)
- [API Specification](./docs/api-spec.md)
- [AI Integration](./docs/ai-integration.md)
- [UI Context](./docs/ui-context.md)
- [Progress Tracker](./docs/progress-tracker.md)

## Local Setup

> Docker services and application scaffolding will be added in the upcoming `P0` steps (`P0-S2`–`P0-S6`).
