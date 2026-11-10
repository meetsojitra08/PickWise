# Code Standards

## 1. General principles

1. **Clarity over cleverness.** Code is read far more than written.
2. **Small units.** Functions do one thing; files stay focused (aim < 200 lines; components < 150).
3. **Explicit over implicit.** Typed inputs and outputs, named constants, no magic numbers.
4. **Fail loudly in dev, gracefully in prod.**
5. **No dead code, no commented-out code, no stray `console.log` / `dd()` / `dump()`.**
6. **Comments explain why, not what.**
7. **Don't repeat yourself, but don't abstract until a pattern appears three times.**

## 2. Backend (Laravel 13 / PHP)

### Style and tooling
- PSR-12 via **Laravel Pint** (`./vendor/bin/pint`). Static analysis via **Larastan** (target level 6+, raise over time).
- `declare(strict_types=1);` in every PHP file. Type-hint all parameters, returns and properties.
- Use backed **enums** for statuses and roles, never raw strings.
- Use **constructor injection**. No facades inside domain logic where an injected service is clearer.

### Naming
| Thing | Convention | Example |
|-------|-----------|---------|
| Classes | PascalCase | `ProductSearchQuery` |
| Methods / variables | camelCase | `calculateValueScore()` |
| DB tables / columns | snake_case, plural tables | `review_summaries` |
| Routes | kebab-case, plural nouns | `/price-history` |
| Actions | Verb + Noun | `CreateReview`, `ApproveReview` |
| Form requests | Verb + Noun + Request | `StoreProductRequest` |
| Resources | Noun + Resource | `ProductResource` |
| Policies | Model + Policy | `ReviewPolicy` |
| Enums | Singular noun | `ReviewStatus` |

### Rules
- Validation **only** in FormRequests. Authorisation in Policies/FormRequest `authorize()`.
- Controllers: max ~10 lines per method; no queries, no business rules.
- Responses **only** through API Resources and the standard envelope.
- Multi-step writes in `DB::transaction()`.
- **Mass assignment:** explicit `$fillable`; never `$guarded = []`.
- **N+1 prevention:** `Model::preventLazyLoading(! app()->isProduction())`; eager load deliberately.
- Migrations: reversible `down()`, foreign keys and indexes defined, never edit a migration that has been merged; add a new one.
- Config via `config()`; `env()` only inside `config/*.php`.
- Use queues for slow or retryable work (LLM calls). Jobs must be idempotent.
- **Redis:** always set a TTL on cache keys, namespace keys (`pickwise:catalog:facets:{category}`), never store the only copy of data in Redis, and clear related cache keys when admin data changes.
- Money: `numeric(12,2)` in DB, string in JSON. Never floats for money logic.

## 3. Frontend (React / TypeScript)

### Style and tooling
- TypeScript `strict: true`. No `any` (use `unknown` + narrowing). ESLint + Prettier clean before every commit.
- Function components and hooks only. One component per file; file name = component name (`ProductCard.tsx`).
- Feature-first folders (see `architecture-context.md`). Shared UI in `components/shared`, shadcn output in `components/ui` (edit freely, they are ours).
- Absolute imports via `@/` alias.

### Naming
| Thing | Convention |
|-------|-----------|
| Components, types | PascalCase |
| Hooks | `useThing` |
| Functions, variables | camelCase |
| Constants | `SCREAMING_SNAKE_CASE` |
| Files (non-component) | kebab-case (`format-price.ts`) |

### Rules
- **Server state** in TanStack Query (query key factories per feature). **Local UI state** in `useState`/`useReducer`. Avoid global state libraries unless proven necessary.
- **All HTTP** goes through `lib/api-client.ts` (CSRF handling, error normalisation). Components never call `fetch` directly.
- **Forms:** React Hook Form + Zod schema; show field-level errors; disable submit while pending.
- **Every data-driven view handles:** loading (skeleton), empty, error (with retry), success.
- Types for API payloads live in `features/*/types` and mirror API Resources.
- No inline styles. Tailwind utilities + design tokens only (see `ui-context.md`). Use `cn()` helper and `cva` for variants.
- No hard-coded colours, radii or font sizes outside tokens.
- Accessibility: semantic elements, labels on inputs, `alt` text, keyboard support (see `ui-context.md` §7).
- Avoid `useEffect` for derived state or data fetching.
- Memoise only after measuring.

## 4. Security rules

| Area | Rule |
|------|------|
| Secrets | Never commit secrets. `.env` ignored. `GROQ_API_KEY` is backend-only. Rotate immediately if leaked |
| Auth | Sanctum cookie auth, hashed passwords (Laravel default Bcrypt/Argon), throttled login, regenerate session on login |
| Authorisation | Policy check on every owned resource; admin routes behind role middleware **and** policies |
| Input | Validate every request; whitelist fields; never trust client-side validation |
| Output | Return Resources only; never expose hidden attributes, emails of others, or internal ids you don't need to |
| SQL | Eloquent/query builder bindings only; no string-concatenated SQL |
| XSS | React escapes by default; never use `dangerouslySetInnerHTML` with user or AI content |
| CSRF | Sanctum CSRF cookie flow for all state-changing requests |
| Uploads | Validate mime, extension and size; store outside web root or on a private disk; generate filenames |
| AI | Check AI replies and keep the API key server-side (see `ai-integration.md` §4) |
| Headers | Security headers in Nginx (CSP, X-Content-Type-Options, Referrer-Policy, frame protection) |
| Dependencies | `composer audit` and `npm audit` in CI |
| Logging | No passwords, tokens, API keys or full prompts containing user PII in logs |

## 5. Testing standards

- **Backend:** Pest. Every endpoint has tests for: success, validation failure, unauthenticated, unauthorised.
- **AI:** fake Groq client; test a valid reply, invalid JSON, an unknown product id, a timeout, and the daily limit.
- **Frontend:** Vitest + Testing Library for critical components and hooks (filters, compare tray, assistant thread).
- Bug fix = write a failing test first.
- Tests are deterministic, isolated (`RefreshDatabase`), and fast. Use factories, not the showcase seeders.
- Target: ≥ 80% coverage on `Actions`, `Services`, `AI`; meaningful tests over coverage chasing.
- CI must pass (lint, static analysis, tests, build) before merge.

## 6. Documentation standards

- Public methods with non-obvious behaviour get a short docblock (why, edge cases).
- Update `progress-tracker.md` every step; update the relevant `/docs` file whenever a decision changes.
- Record notable decisions in `docs/decisions.md` (short ADR entries: context, decision, consequences).
- README stays accurate: setup steps must work on a clean clone.

## 7. Definition of "clean" before commit

```bash
# backend
./vendor/bin/pint --test && ./vendor/bin/phpstan analyse && ./vendor/bin/pest
# frontend
npm run lint && npm run typecheck && npm run test && npm run build
```

If any command fails, the step is not done.
