# Pickwise: Laravel to FastAPI Migration Tasks

This document tracks all tasks for migrating the **Pickwise** backend from **Laravel 13 (PHP 8.3)** to **FastAPI (Python 3.12+ / Pydantic v2 / SQLAlchemy 2.0 async)**.

> **Full Detailed Tracker:** See [docs/fastapi-migration-tracker.md](file:///d:/Pickwise/docs/fastapi-migration-tracker.md) for full phase-by-phase specifications, technical notes, and verification criteria.

---

## Executive Summary & Target Stack

- **Target Backend:** Python 3.12, FastAPI 0.115+, Pydantic v2, SQLAlchemy 2.0 (async), `asyncpg`
- **Database & Cache:** PostgreSQL 17 (`tsvector` FTS, `pg_trgm`), Redis 7
- **AI Integrations:** Groq Python Async SDK (`llama-3.3-70b-versatile`)
- **Frontend Goal:** 100% API contract parity with React 19 SPA (zero frontend breaking changes)

---

## Migration Roadmap

### Phase F0: Project Setup, Tooling & Foundations
- [ ] **F0-S1** Initialize Python project structure, `pyproject.toml`, dependencies (`uv`/`poetry`)
- [ ] **F0-S2** API conventions, standard response envelopes (`data`/`meta`), error handling & `X-Request-Id`
- [ ] **F0-S3** Docker & local infrastructure: FastAPI `Dockerfile`, update `docker-compose.yml` and Nginx
- [ ] **F0-S4** Health check endpoint `GET /api/v1/health` (PostgreSQL, Redis, Groq checks)

### Phase F1: Database Schema, Models & Seeders
- [ ] **F1-S1** Alembic setup & PostgreSQL extensions (`pg_trgm`, `unaccent`)
- [ ] **F1-S2** SQLAlchemy 2.0 async declarative models (Users, Categories, Products, Specs, Reviews, etc.)
- [ ] **F1-S3** Indexes & full-text search definitions (GIN `search_vector`, trigram indexes)
- [ ] **F1-S4** Deterministic demo seeders (~60 products, categories, reviews, demo accounts)

### Phase F2: Authentication, Session Management & Accounts
- [ ] **F2-S1** SPA cookie & CSRF compatibility layer (`GET /sanctum/csrf-cookie`, `XSRF-TOKEN`)
- [ ] **F2-S2** Authentication endpoints (`/register`, `/login`, `/logout`, `/me`)
- [ ] **F2-S3** Security dependencies (`get_current_user`, `require_admin`) & rate limiting
- [ ] **F2-S4** Customer account management (`/profile`, `/password`, `/preferences`)

### Phase F3: Catalog, Search & Filtering
- [ ] **F3-S1** Category & facet endpoints (`GET /categories`, `GET /categories/{slug}/filters` + Redis cache)
- [ ] **F3-S2** Value Score calculation engine (`ValueScoreCalculator`)
- [ ] **F3-S3** PostgreSQL full-text search & trigram ranking (`GET /products` with dynamic spec filters)
- [ ] **F3-S4** Product detail (`GET /products/{slug}`), price history, and similar products

### Phase F4: Reviews, Wishlist & Comparison
- [ ] **F4-S1** Product reviews & rating aggregation (`ProductRatingAggregator`)
- [ ] **F4-S2** Wishlist management endpoints (`GET`, `POST`, `DELETE /wishlist`)
- [ ] **F4-S3** Side-by-side comparison matrix (`POST /compare` with `higher_is_better` row winners)
- [ ] **F4-S4** Saved comparisons & public sharing (`POST /comparisons/{id}/share`, public token view)

### Phase F5: AI Integration (Groq, Quotas & Shopping Assistant)
- [ ] **F5-S1** Async Groq client (`GroqClient`) and fake client for tests
- [ ] **F5-S2** AI quota & usage tracking system (Redis sliding window, `GET /assistant/quota`, `ai_usage_logs`)
- [ ] **F5-S3** Compare AI verdict (`POST /compare/verdict`)
- [ ] **F5-S4** AI review summary generation (`ReviewSummaryService` background task)
- [ ] **F5-S5** Grounded AI shopping assistant (`AssistantService` with anti-hallucination DB verification)

### Phase F6: Admin Panel & Management APIs
- [ ] **F6-S1** Admin audit logger (`AuditLogger` service & `GET /admin/activity-logs`)
- [ ] **F6-S2** Admin dashboard KPIs (`GET /admin/dashboard`) & AI usage analytics (`GET /admin/ai/usage`)
- [ ] **F6-S3** Category & spec definition CRUD
- [ ] **F6-S4** Brand & product management (CRUD, bulk status, image upload/reorder/delete)
- [ ] **F6-S5** User management & review moderation queue (with auto-summary trigger)

### Phase F7: Verification, Testing & OpenAPI Validation
- [ ] **F7-S1** Unit & service test suite (ValueScore, CompareMatrix, Assistant grounding, Quotas)
- [ ] **F7-S2** Feature & API endpoint test suite (replicate 40+ Laravel Pest test cases)
- [ ] **F7-S3** OpenAPI contract validation against `docs/openapi.yaml`
- [ ] **F7-S4** End-to-end integration smoke test with React 19 frontend

### Phase F8: Production Hardening, CI/CD & Documentation
- [ ] **F8-S1** Production multi-stage Dockerfile with Gunicorn/Uvicorn workers
- [ ] **F8-S2** GitHub Actions CI workflow (Ruff lint/format, Mypy type-check, Pytest)
- [ ] **F8-S3** Documentation updates: ADR-008, updated architecture diagrams in `README.md`
