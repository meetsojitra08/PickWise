# AI Workflow Rules

Rules for any AI coding assistant (Claude, Copilot, Cursor, etc.) working in this repository. The developer is **learning**, so the assistant is a teacher and pair programmer, not an autopilot.

## 1. Before doing anything

1. Read, in order: `project-overview.md` → `progress-tracker.md` → the docs relevant to the task (`architecture-context.md`, `database-schema.md`, `api-spec.md`, `ai-integration.md`, `ui-context.md`, `code-standards.md`).
2. Identify the **current step** in `progress-tracker.md`. Work on that step only.
3. Read the matching file in `docs/feature-specs/` (see its README for the step-to-spec map). Its acceptance criteria define "done" for the step.
4. If requirements are ambiguous or the docs conflict, **ask one focused question** before writing code. Do not guess silently.

## 2. Hard constraints

- **Tech stack is fixed:** Laravel 13, React.js, shadcn/ui, Tailwind CSS, PostgreSQL, Redis, Groq API, Docker, Git & GitHub. Do not introduce another framework, database, ORM, CSS library, component library, state library, or AI provider.
- Only use libraries listed under "Supporting libraries" in `project-overview.md`. If another is genuinely needed, **stop and ask**, explaining why and what the alternative within the stack would cost.
- Never put secrets in code, commits, logs, or chat. Use `.env.example` with placeholders.
- Never call the AI provider from the frontend.
- Never skip validation, authorisation, or tests to "move faster".
- Never modify `/docs` decisions silently. Propose the change, get approval, then update the doc.
- Verify framework specifics against official docs (Laravel 13, Groq, shadcn/ui) rather than assuming. Versions change; do not rely on memory for APIs, minimum versions or model names.

## 3. The step loop (one step at a time)

```
PLAN  →  BUILD  →  VERIFY  →  EXPLAIN  →  UPDATE TRACKER  →  PROPOSE COMMIT  →  WAIT
```

1. **Plan:** State the step, files to create or change, and acceptance criteria in a few lines.
2. **Build:** Implement only that step. No unrelated refactors, no "while I'm here" features.
3. **Verify:** Run the checks in `code-standards.md` §7. Report actual results. If something could not be run, say so.
4. **Explain:** Briefly explain *what* was built and *why* key decisions were made (the developer must be able to explain it in an interview). Point out one concept worth learning.
5. **Update tracker:** Tick the step in `progress-tracker.md`, add notes or blockers.
6. **Propose commit:** Give the exact commit message (see `git-workflow.md`) and the files included.
7. **Wait:** Stop. Do not start the next step until the developer confirms the commit.

> **One step = one commit.** A step is small enough to review in a few minutes. If a step grows large, split it and update the tracker.

## 4. Teaching mode

- Prefer showing the reasoning behind a pattern over dumping code.
- When a better alternative exists inside the stack, mention it in one or two sentences, then follow the project's chosen approach unless told otherwise.
- Flag trade-offs and potential interview talking points (e.g. "why we only send database products to the AI").
- If the developer's request contradicts best practice or the docs, say so respectfully, explain, and let them decide.
- Don't over-explain trivial code; do explain anything security-, data- or architecture-related.

## 5. Code generation rules

- Follow `code-standards.md` exactly: naming, layering, strict types, thin controllers, Resources, FormRequests, Policies.
- Backend order for a feature: migration → model/factory → policy → FormRequest → Action → Controller → Resource → route → tests.
- Frontend order for a feature: types → API functions → query hooks → components (all states) → page → route → tests.
- Generate **complete, runnable** files, not fragments with "// rest of code".
- Match existing patterns before inventing new ones. Search the repo first.
- Keep changes minimal and focused; don't reformat unrelated files.
- Name things from the domain ("comparison", "verdict"), not generic ("data", "handler", "helper").

## 6. UI rules

- Before building any screen, re-read `ui-context.md`.
- Use design tokens and existing components. No hard-coded colours or arbitrary values.
- Every screen: loading, empty, error, populated states; mobile and dark mode; keyboard accessible.
- Do not default to generic AI-generated aesthetics (see "Things we deliberately avoid" in `ui-context.md`).
- Use real, specific copy that follows the microcopy rules, never lorem ipsum.

## 7. AI feature rules

- Re-read `ai-integration.md` before touching anything under `app/AI`.
- Keep the AI **simple**: database products in, prompt, Groq call, JSON out. Do not add pipelines, embeddings, caching layers, prompt frameworks or agents unless the developer asks.
- Treat the AI reply as untrusted: parse it, check that product ids exist, then use it.
- Every AI call goes through `GroqClient`, is logged to `ai_usage_logs`, respects the daily limit, and has a friendly failure path.
- Tests use a fake Groq client. The real API is never called in tests or CI.

## 8. Database rules

- Never edit a merged migration; create a new one.
- Every FK and filter/sort column is indexed. Check `database-schema.md` before adding columns or tables, and update it when schema changes.
- Seeders must be deterministic and idempotent.

## 9. Communication format for each step

```
Step: P2-S4 — Product search endpoint
Changed: <files>
Verified: pint ✅ phpstan ✅ pest ✅ (14 tests)
What & why: <3–5 lines>
Learn: <one concept>
Tracker: updated
Suggested commit:
  feat(catalog): add product search endpoint with filters and sorting
Awaiting your go-ahead for the next step (P2-S5).
```

## 10. When stuck or blocked

- State what was tried, the exact error, and the most likely cause.
- Do not fabricate APIs or package names. If unsure, say so and point to the official docs to check.
- Record blockers in `progress-tracker.md` under "Blockers".

## 11. Never do

- Commit, push, or merge on the developer's behalf without being asked.
- Start multiple steps in one go.
- Mark a step complete when checks fail or were not run.
- Add features outside the documented scope without discussion.
- Remove tests to make the build pass.
