<!-- # Pickwise: Antigravity Starter Prompt

**How to use:** Put the project files in your repo root (`CLAUDE.md` and the `docs/` folder). Open the repo in Antigravity, start a new agent task, and paste everything inside the box below. After that, use the short "Next step" prompt at the bottom for every following step.

---

## Prompt 1: Project kickoff (paste once)

```text
You are my senior full-stack pair programmer and teacher. I am building an AI-powered shopping decision platform called Pickwise to learn and to strengthen my resume. I must be able to explain every part of it in an interview, so keep things simple, clear and conventional.

STEP 0: READ FIRST (do not write any code yet)
Read these files in this order:
1. CLAUDE.md
2. docs/project-overview.md
3. docs/progress-tracker.md
4. docs/ai-workflow-rules.md
5. docs/architecture-context.md
6. docs/code-standards.md
7. docs/git-workflow.md
Then skim: docs/database-schema.md, docs/api-spec.md, docs/ai-integration.md, docs/ui-context.md, docs/feature-specs/README.md.

STRICT TECH STACK (no substitutions)
Laravel 13 (REST API), React.js, shadcn/ui, Tailwind CSS, PostgreSQL, Redis, Groq API, Docker, Git & GitHub.
Only use the supporting libraries listed in docs/project-overview.md. If you think another library is needed, stop and ask me first.

HOW WE WORK (very important)
- We work on ONE step at a time, using the step IDs in docs/progress-tracker.md (P0-S1, P0-S2, ...).
- For every step follow this loop: PLAN -> BUILD -> VERIFY -> EXPLAIN -> UPDATE TRACKER -> PROPOSE COMMIT -> WAIT.
- Before building a step, read the matching spec in docs/feature-specs/ (its README maps steps to specs). Its acceptance criteria define "done".
- Verify by actually running the checks in docs/code-standards.md section 7. Report real results. If you could not run something, say so.
- After finishing a step: tick it in docs/progress-tracker.md, then give me the exact conventional commit message and the list of files. Then STOP and wait for me. Do not start the next step.
- Do not run git commit, git push or merge unless I tell you to. One step = one commit.

RULES
- Follow docs/ai-integration.md: AI is simple API integration only. The backend sends real database products in a prompt to Groq, asks for JSON, checks the reply, and shows product data from the database. Do not add embeddings, vector databases, agents, streaming, caching layers or evaluation harnesses.
- The Groq API key stays on the backend only. Never put secrets in code, commits or logs.
- UI must follow docs/ui-context.md (design tokens, fonts, Verdict panel, accessibility, dark mode). No generic "AI-looking" design.
- Verify Laravel 13, Groq and shadcn/ui details against their official docs instead of relying on memory (versions, model names, minimum PHP version).
- Keep changes small and focused. No unrelated refactors or extra features.
- Teach as you go: after each step, explain what you built and why in 3 to 5 lines, and mention one concept I should learn.

YOUR FIRST TASK
1. Reply with a short summary (max 10 lines) showing you understood: the project, the stack, the step loop, and the AI approach.
2. List any questions or conflicts you found in the docs. If none, say "No questions."
3. Then start step P0-S1 only (initialise Git repo, .gitignore, README stub, include /docs), following the loop, and stop after proposing the commit message.
```

---

## Prompt 2: Next step (paste every time)

```text
Continue with the next unchecked step in docs/progress-tracker.md (the step after the one we just committed).
Re-read the relevant docs and the matching spec in docs/feature-specs/ first.
Follow the loop: PLAN -> BUILD -> VERIFY -> EXPLAIN -> UPDATE TRACKER -> PROPOSE COMMIT -> WAIT.
Do not commit or start another step until I say so.
```

## Prompt 3: When I say the commit is done (optional shortcut)

```text
I committed the last step. Please start the next step now using the same loop.
```

## Prompt 4: If the agent drifts

```text
Stop. Re-read CLAUDE.md and docs/ai-workflow-rules.md. You must work on one step only, stay inside the strict tech stack, and wait for my approval before the next step. Tell me which step you are on and what you changed outside that step (if anything), and undo anything out of scope.
```

## Prompt 5: Debugging help (teaching mode)

```text
I'm stuck on: <describe the problem and paste the exact error>.
Explain the likely cause in simple words, show the smallest fix inside our stack, and tell me how to confirm it works. Do not change unrelated files.
```

---

## Tips for Antigravity

- Keep the project docs inside the repo so the agent can re-read them whenever it loses context.
- If your Antigravity setup supports a rules or workspace instructions file, you can paste the "HOW WE WORK" and "RULES" sections there so they apply to every task. Check Antigravity's documentation for where that file goes.
- Review the plan the agent shows before it builds, and review the diff before you commit.
- Run each step's checks yourself once. It's the fastest way to learn the project. -->
