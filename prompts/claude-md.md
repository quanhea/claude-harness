---
description: Generate CLAUDE.md (~100 lines, table of contents)
outputs: ["CLAUDE.md"]
always-run: true
---

# Task: Generate CLAUDE.md

**Output:** `{{PROJECT_DIR}}/CLAUDE.md`

You are generating a CLAUDE.md file — the primary entry point for Claude Code in this project. This is the most important file in the harness. It must reference everything Claude might need.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Read existing CLAUDE.md if present (merge, do not overwrite)"
3. "Identify project name, language, framework, package manager, test framework, and all commands from discovery"
4. "Write CLAUDE.md following the exact template below"
5. "Verify CLAUDE.md is under 100 lines"
6. "Verify all section headings match the template exactly"
7. "Verify Knowledge Base only lists docs that will actually be generated"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Context

Detect everything yourself by reading the project:
- **Language / framework / commands**: read `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent
- **Is this a frontend project?**: check for `.tsx` / `.jsx` / `.vue` / `.svelte` files or framework configs (Next/Vite/Nuxt/Svelte/Angular)
- **Is this an app?**: check for `scripts.start` / `scripts.dev` in `package.json`, or `main.py` / `manage.py` / `main.go` / `Dockerfile`
- **Existing files**: check for `CLAUDE.md`, `ARCHITECTURE.md`, `.claude/` directory (merge, don't overwrite)

If CLAUDE.md already exists, read it. Preserve any user-written content. Only ADD missing sections — do not remove existing content.

## Template

CLAUDE.md must follow this EXACT format. Fill in `{{...}}` placeholders from the project manifest.

```markdown
# {{projectName}}

> This file is your map. Read the linked docs on demand — don't load everything at once.
> When you receive a task, find the relevant doc below and read it first.

## Quick Reference

- **Language**: {{discovered}}
- **Framework**: {{discovered}}
- **Package manager**: {{discovered}}
- **Test framework**: {{discovered}}

## Commands

{{discovered — only list commands that actually exist in the project:}}
- **Build**: `{{discovered build command}}`
- **Test**: `{{discovered test command}}`
- **Lint**: `{{discovered lint command}}`
- **Format**: `{{discovered format command}}`
- **Dev**: `{{discovered dev server command}}`

## How to Work in This Repo

Local development is worktree-only — see `docs/WORKTREE.md` and `.claude/rules/git-workflow.md`.

### Rule 1 — Plans are first-class artifacts

Every non-trivial change starts with a plan file committed to `docs/exec-plans/active/<slug>.md` BEFORE any code is written. Plans use checkbox lists (`[ ]` pending, `[x]` done) with nested subtasks — they are how you hand off work to the next session or agent without losing context. Update the plan as you work: check off tasks, append to the decision log when you make a non-obvious choice, record surprises. When the plan is complete, move the file to `docs/exec-plans/completed/` so the history stays visible. Small one-off fixes don't need a plan; anything that spans more than one commit does. See `docs/PLANS.md` for the template and lifecycle.

### Other conventions

- **Before writing code**: skim `ARCHITECTURE.md` for module boundaries.
- **Before committing or opening a PR**: follow `docs/GIT_WORKFLOW.md`.
- **When making a design decision**: check `docs/design-docs/` for prior choices.

## Knowledge Base — Read On Demand

Don't load all of these. Read the one relevant to your current task.

| Path | When to read it |
|------|----------------|
| `ARCHITECTURE.md` | Before adding code — module boundaries, layers, dependency rules |
| `docs/WORKTREE.md` | Before starting any local work — worktree-first development, service isolation |
| `docs/GIT_WORKFLOW.md` | Before branching, committing, or creating PRs |
| `docs/INFRASTRUCTURE.md` | When working with services, CI/CD, cloud, databases |
| `docs/QUALITY_SCORE.md` | When assessing or grading code quality per domain |
| `docs/PLANS.md` | When planning work or checking active/completed plans |
| `docs/PRODUCT_SENSE.md` | When making UX decisions or using domain terminology |
| `docs/RELIABILITY.md` | When handling errors, SLAs, or observability |
| `docs/SECURITY.md` | When touching auth, data handling, or secrets |
{{if isFrontend}}| `docs/DESIGN.md` | When working on frontend design or component patterns |
| `docs/FRONTEND.md` | When working on frontend architecture or data fetching |{{end}}
{{if isApp}}| `docs/OBSERVABILITY.md` | When adding logging, metrics, or tracing |{{end}}
| `docs/design-docs/core-beliefs.md` | For the team's operating principles |
| `docs/exec-plans/tech-debt-tracker.md` | For known technical debt items |
| `docs/references/` | For external API docs and llms.txt files |

## Rules — Loaded Every Session

These are in `.claude/rules/` and are loaded automatically:

| Rule | What it enforces |
|------|-----------------|
| `architecture.md` | {{discovered — module boundaries, dependency direction}} |
| `testing.md` | {{discovered — test conventions, loaded when editing test files}} |
| `documentation.md` | Documentation maintenance and progressive disclosure |
| `git-workflow.md` | {{discovered — branching, commits, PR process}} |

## Skills — Invoke When Needed

| Skill | When to use |
|-------|-------------|
| `/skill-name` | See `.claude/skills/` for project-specific skills generated from usage history |

## Hooks — Run Automatically

Custom linters in `.claude/hooks/` run after every file edit and inject
remediation into context. You don't need to invoke them — they fire on PostToolUse.

## Principles

1. **Repository is the system of record** — if it's not in the repo, it doesn't exist
2. **This file is the map** — read linked docs on demand, don't load everything
3. **Enforce mechanically** — rules and hooks catch violations, not memory
4. **Correct > clever** — well-tested, composable, boring code wins
```

## Rules

- **Hard limit: 100 lines.** If it would exceed 100 lines, cut prose. Only pointers — no explanations inline.
- Do NOT include: code snippets (beyond commands), how-to guides, API docs, or architecture details. Those belong in the linked documents.
- Knowledge Base rows: only include docs that will actually be generated for this project.
- Rules rows: only include rules that will actually be generated.
- Include the `{{if isFrontend}}` rows only if this is a frontend project; include the `{{if isApp}}` rows only if this is an app. Remove the `{{if ...}}` markers themselves from the output.
- The "When to read it" column must tell Claude WHEN to load the doc, not just describe its contents.
- If CLAUDE.md already exists, read it first and MERGE — preserve user content.
