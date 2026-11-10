# CLAUDE.md

This repository is **Pickwise**, an AI-powered shopping decision platform (learning and portfolio project).

**Before any work, read:**
1. `docs/project-overview.md`
2. `docs/progress-tracker.md` (find the current step)
3. `docs/ai-workflow-rules.md` (how you must work here)
4. The matching spec in `docs/feature-specs/` for the current step
5. The other task-relevant files in `docs/` (see `docs/README.md`)

**Non-negotiables**
- Strict stack: Laravel 13, React.js, shadcn/ui, Tailwind CSS, PostgreSQL, Redis, Groq API, Docker, Git & GitHub. No substitutions. Ask before adding any library not listed in `docs/project-overview.md`.
- Work on **one step at a time**. After each step: verify, update `docs/progress-tracker.md`, propose a conventional commit message, then **stop and wait**.
- Never commit, push or merge unless asked. Never expose secrets. The Groq API is called from the backend only.
- UI must follow `docs/ui-context.md`. AI features must follow `docs/ai-integration.md`.
- Verify framework specifics against official docs; do not rely on memory for versions or APIs.
