# Git Workflow

Core rule: **one completed step = one commit.** The history should read like a tutorial of how the project was built.

## 1. Branching

```
main            Always deployable. Protected. Only receives merged PRs.
└── phase/P2-catalog        One branch per phase (see progress-tracker.md)
```

- Branch from `main`: `git switch -c phase/P2-catalog`
- Each **step** is a single commit on the phase branch.
- When the phase is done and CI is green, open a PR → squash is **not** used (keep step commits) → merge with a merge commit or rebase-merge.
- Hotfixes: `fix/short-description` from `main`.
- **Exception for the very first commit:** P0-S1 is committed directly on `main` because a new repo has no commits to branch from. Create `phase/P0-foundation` right after it and do P0-S2 onward there.

## 2. Commit format (Conventional Commits)

```
<type>(<scope>): <imperative summary, max 72 chars>

<optional body: what and why, not how>
<optional footer: Refs P2-S4>
```

| Type | Use |
|------|-----|
| `feat` | New user-facing capability |
| `fix` | Bug fix |
| `refactor` | Code change with no behaviour change |
| `test` | Adding or fixing tests |
| `docs` | Documentation only |
| `style` | Formatting only |
| `chore` | Tooling, dependencies, config |
| `build` / `ci` | Docker, pipeline |
| `perf` | Performance improvement |
| `db` | Migrations and seeders |

Scopes: `auth`, `catalog`, `product`, `review`, `compare`, `assistant`, `ai`, `wishlist`, `account`, `admin`, `ui`, `docker`, `redis`, `docs`, `db`.

Examples:
```
chore(docker): add compose stack for nginx, php, postgres and node
db(catalog): create categories, brands and products tables
feat(catalog): add product search endpoint with filters and sorting
feat(ui): build ProductCard with wishlist and compare toggles
feat(ai): send only matching database products to the assistant prompt
test(ai): cover over-budget and unknown-id validator cases
```

## 3. The per-step commit protocol

1. Confirm the working tree contains **only** this step's changes (`git status`, `git diff`).
2. Run the clean checks (`code-standards.md` §7).
3. Tick the step in `progress-tracker.md` (this change is part of the same commit).
4. Stage deliberately: `git add -p` or specific paths. Avoid blind `git add .`.
5. Commit with the proposed message.
6. Push the phase branch: `git push -u origin phase/P2-catalog`.
7. Only then begin the next step.

```bash
git status
git diff --staged
git commit -m "feat(catalog): add product search endpoint with filters and sorting" -m "Refs P2-S4"
git push
```

## 4. Rules

- Never commit `.env`, secrets, `vendor/`, `node_modules/`, build output, or local storage files.
- Never commit a failing build.
- Never rewrite history on `main`. On your own phase branch, `git commit --amend` before pushing is fine.
- Keep commits atomic. Do not mix a feature with an unrelated refactor.
- Write the message for a future reader. "fix stuff" is not a message.

## 5. Pull requests

PR title = phase name. Description template:

```markdown
## Phase
P2: Catalog & discovery

## What changed
- ...

## Screenshots / recordings
(UI changes: light + dark + mobile)

## How to test
1. `docker compose up -d`
2. ...

## Checklist
- [ ] Lint, static analysis, tests pass
- [ ] Docs updated
- [ ] Tracker updated
- [ ] Accessibility checked
```

## 6. CI (GitHub Actions)

On every push and PR: install deps (cached) → Pint → Larastan → Pest (Postgres and Redis service containers) → ESLint → typecheck → Vitest → build → `composer audit` / `npm audit`. Branch protection on `main` requires CI green.

## 7. Repository hygiene

- `.gitignore` covers Laravel, Node, Docker volumes, IDE folders, `.env*` (except `.env.example`).
- Add `LICENSE` and keep a polished `README.md` (screenshots, architecture diagram, setup, feature list, AI design notes). Recruiters read this first.
- Tag milestones: `v0.1.0` (MVP), `v0.2.0` (AI), `v1.0.0` (polished release).
