# Decisions Log (ADRs)

Short records of significant decisions. Add a new entry whenever a decision changes architecture, stack usage, or scope. Newest at the bottom. Never delete entries; supersede them.

**Template**

```
## ADR-00X: Title
Date: YYYY-MM-DD · Status: Proposed | Accepted | Superseded by ADR-00Y
Context: What problem or constraint led to this?
Decision: What did we choose?
Consequences: Benefits, costs, follow-ups.
```

---

## ADR-001: Separate React SPA and Laravel REST API
Date: _(fill)_ · Status: Accepted
**Context:** The objective specifies RESTful APIs, React.js, and Laravel as distinct technologies.
**Decision:** Monorepo with `backend/` (Laravel API) and `frontend/` (React SPA), served same-origin through Nginx.
**Consequences:** Clean separation and a demonstrable API. Requires Sanctum SPA auth and CSRF handling. No Inertia.

## ADR-002: Sanctum cookie-based SPA authentication
Date: _(fill)_ · Status: Accepted
**Context:** Tokens in `localStorage` are exposed to XSS.
**Decision:** HttpOnly session cookies via Sanctum, same-origin through the proxy.
**Consequences:** Safer by default; needs the CSRF cookie flow and correct `SANCTUM_STATEFUL_DOMAINS`.

## ADR-003: PostgreSQL for queue, cache and sessions
Date: _(fill)_ · Status: Superseded by ADR-007
**Context:** The stack is strict; Redis is not part of it.
**Decision:** Use Laravel `database` drivers for queue, cache and sessions.
**Consequences:** One fewer service and simple local setup. Lower throughput than Redis, which is acceptable at this scale.

## ADR-004: Simple, database-grounded Groq integration
Date: _(fill)_ · Status: Accepted
**Context:** The goal is basic AI API integration that is easy to explain, not advanced AI engineering. LLMs can still invent products.
**Decision:** The backend queries PostgreSQL for real products (budget and category as SQL filters), sends only those to Groq in a prompt, asks for JSON, and checks that every recommended id exists.
**Consequences:** Simple, testable and reliable. No embeddings, caching layers, evals or streaming.

## ADR-005: Postgres full-text and `pg_trgm` for search
Date: _(fill)_ · Status: Accepted
**Context:** Need relevant, typo-tolerant search without extra infrastructure.
**Decision:** `tsvector` + GIN for relevance, `pg_trgm` for fuzzy matching.
**Consequences:** Stays in-stack; tuning needed for ranking quality.

## ADR-006: Decision tool, not a store
Date: _(fill)_ · Status: Accepted
**Context:** Checkout and payments add large scope with little learning value for the stated goals.
**Decision:** Products link out to the store; no cart or orders.
**Consequences:** Focus remains on discovery, comparison and AI. Revisit only if scope is explicitly expanded.

## ADR-007: Add Redis for cache, queue, sessions and rate limiting
Date: _(fill)_ · Status: Accepted
**Context:** The developer wants to learn and show Redis. It also suits expiring data (rate limits, daily AI counters, cached catalog data) better than database tables.
**Decision:** Add Redis to the stack. Laravel uses it for cache, queue, sessions and rate limiting. PostgreSQL remains the source of truth for all real data.
**Consequences:** One more Docker service and a PHP extension (phpredis). Better performance and a stronger portfolio story. The app must keep working if Redis is cleared.
