# Pickwise: Laravel to FastAPI Migration Tasks

This document tracks all tasks for migrating the **Pickwise** backend from **Laravel 13 (PHP 8.3)** to **FastAPI (Python 3.12+ / Pydantic v2 / SQLAlchemy 2.0 async)**.

> **Full Detailed Tracker:** See [docs/fastapi-migration-tracker.md](file:///d:/Pickwise/docs/fastapi-migration-tracker.md) for full phase-by-phase specifications, technical notes, and verification criteria.

---

## Executive Summary & Target Stack

- **Target Backend:** Python 3.12, FastAPI 0.115+, Pydantic v2, SQLAlchemy 2.0 (async), `asyncpg`
- **Database & Cache:** PostgreSQL 17 (`tsvector` FTS, `pg_trgm`), Redis 7
- **AI Integrations:** Groq Python Async SDK (`llama-3.3-70b-versatile`)
- **Frontend Goal:** 100% API contract parity with React 19 SPA (zero frontend breaking changes)
- **Status:** **MIGRATION 100% COMPLETE & VERIFIED** (Laravel completely removed)

---

## Migration Roadmap

### Phase F0: Project Setup, Tooling & Foundations
- [x] **F0-S1** Initialize Python project structure, `pyproject.toml`, dependencies (`uv`/`poetry`/`pip`)
- [x] **F0-S2** API conventions, standard response envelopes (`data`/`meta`), error handling & `X-Request-Id`
- [x] **F0-S3** Docker & local infrastructure: FastAPI `Dockerfile`, update `docker-compose.yml` and Nginx
- [x] **F0-S4** Health check endpoint `GET /api/v1/health` (PostgreSQL, Redis, Groq checks)

### Phase F1: Database Schema, Models & Seeders
- [x] **F1-S1** Database initialization & PostgreSQL extensions (`pg_trgm`, `unaccent`)
- [x] **F1-S2** SQLAlchemy 2.0 async declarative models (Users, Categories, Products, Specs, Reviews, etc.)
- [x] **F1-S3** Indexes & full-text search definitions (GIN `search_vector`, trigram indexes)
- [x] **F1-S4** Deterministic demo seeders (6 categories, 21 brands, 60 products with specs, reviews, demo accounts)

### Phase F2: Authentication, Session Management & Accounts
- [x] **F2-S1** SPA cookie & CSRF compatibility layer (`GET /sanctum/csrf-cookie`, `XSRF-TOKEN`)
- [x] **F2-S2** Authentication endpoints (`/register`, `/login`, `/logout`, `/me`)
- [x] **F2-S3** Security dependencies (`get_current_user`, `require_admin`) & rate limiting
- [x] **F2-S4** Customer account management (`/profile`, `/password`, `/preferences`)

### Phase F3: Catalog, Search & Filtering
- [x] **F3-S1** Category & facet endpoints (`GET /categories`, `GET /categories/{slug}/filters` + Redis cache)
- [x] **F3-S2** Value Score calculation engine (`ValueScoreCalculator` with Bayesian confidence)
- [x] **F3-S3** PostgreSQL full-text search & trigram ranking (`GET /products` with dynamic spec filters)
- [x] **F3-S4** Product detail (`GET /products/{slug}`), price history, and similar products

### Phase F4: Reviews, Wishlist & Comparison
- [x] **F4-S1** Product reviews & rating aggregation (`ProductRatingAggregator`)
- [x] **F4-S2** Wishlist management endpoints (`GET`, `POST`, `DELETE /wishlist`)
- [x] **F4-S3** Side-by-side comparison matrix (`POST /compare` with `higher_is_better` row winners)
- [x] **F4-S4** Saved comparisons & public sharing (`POST /comparisons/{id}/share`, public token view)

### Phase F5: AI Integration (Groq, Quotas & Shopping Assistant)
- [x] **F5-S1** Async Groq client (`GroqClient`) and fake client for tests
- [x] **F5-S2** AI quota & usage tracking system (Redis sliding window, `GET /assistant/quota`, `ai_usage_logs`)
- [x] **F5-S3** Compare AI verdict (`POST /compare/verdict`)
- [x] **F5-S4** AI review summary generation (`ReviewSummaryService` background task)
- [x] **F5-S5** Grounded AI shopping assistant (`AssistantService` with anti-hallucination DB verification)

### Phase F6: Admin Panel & Management APIs
- [x] **F6-S1** Admin audit logger (`AuditLogger` service & `GET /admin/activity-logs`)
- [x] **F6-S2** Admin dashboard KPIs (`GET /admin/dashboard`) & AI usage analytics (`GET /admin/ai/usage`)
- [x] **F6-S3** Category & spec definition CRUD
- [x] **F6-S4** Brand & product management (CRUD, bulk status, image upload/reorder/delete)
- [x] **F6-S5** User management & review moderation queue (with auto-summary trigger)

### Phase F7: Verification, Testing & OpenAPI Validation
- [x] **F7-S1** Unit & service test suite (ValueScore, CompareMatrix, Assistant grounding, Quotas)
- [x] **F7-S2** Feature & API endpoint test suite (20/20 Pytest integration tests passing)
- [x] **F7-S3** Frontend unit & integration test suite (308/308 Vitest tests passing)
- [x] **F7-S4** End-to-end integration smoke test with React 19 frontend (Vite build clean, full journeys verified)

### Phase F8: Production Hardening, CI/CD & Documentation
- [x] **F8-S1** Complete removal of Laravel backend and legacy PHP Docker images
- [x] **F8-S2** Production multi-stage Dockerfile and Docker Compose orchestration
- [x] **F8-S3** Documentation updates: updated migration tracker and completion logs
