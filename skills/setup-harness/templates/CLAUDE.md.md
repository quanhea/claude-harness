# Template: .claude/CLAUDE.md

> This is the MOST IMPORTANT file in the harness. It's the ONE file always loaded
> into context every session. It MUST reference EVERYTHING the agent might need.
>
> Two rules:
> 1. Keep it concise — pointers, not content
> 2. Reference EVERY doc, rule, skill, agent, and hook — if it's not here, it's invisible
>
> NEVER hardcode conventions — discover them from the project.

---

## How to Generate

### For EXISTING projects:

**Launch an Explore agent** to discover the project essentials:

```
Agent(subagent_type: "Explore", prompt: "Find the essential project info for CLAUDE.md:
1. Project name (from package.json, Cargo.toml, go.mod, pyproject.toml, or directory name)
2. Language and framework
3. Package manager
4. Test framework and test command
5. Build command
6. Lint/format command
7. Dev server command
8. Top-level domains/modules
9. Whether it's a monorepo
10. Any existing CLAUDE.md or README with project conventions
Report all findings.")
```

### For GREENFIELD projects:

Use the detected language/framework from the shell injection context. Propose commands
based on the framework's standard tooling (research if unsure).

---

## Output Structure

Write `.claude/CLAUDE.md` — concise, pointers only. Include ALL sections below.
Only include rows/sections for files that were actually generated.

```markdown
# {{project-name}}

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

**Before writing code**: Read `ARCHITECTURE.md` for module boundaries.
**Before committing**: Read `GIT_WORKFLOW.md` for branching and commit conventions.
**Before creating a PR**: Follow the PR process in `GIT_WORKFLOW.md`.
**When touching a new domain**: Read that domain's section in `ARCHITECTURE.md`.
**When making a design decision**: Check `docs/design-docs/` for prior decisions.

## Knowledge Base — Read On Demand

Don't load all of these. Read the one relevant to your current task.

| Path | When to read it |
|------|----------------|
| `ARCHITECTURE.md` | Before adding code — module boundaries, layers, dependency rules |
| `GIT_WORKFLOW.md` | Before branching, committing, or creating PRs |
| `QUALITY_SCORE.md` | When assessing or grading code quality per domain |
| `INFRASTRUCTURE.md` | When working with services, CI/CD, cloud, databases |
| `RELIABILITY.md` | When handling errors, SLAs, or observability |
| `SECURITY.md` | When touching auth, data handling, or secrets |
| `PRODUCT_SENSE.md` | When making UX decisions or using domain terminology |
| `PLANS.md` | When planning work or checking active/completed plans |
| `DESIGN.md` | When working on frontend design or component patterns |
| `FRONTEND.md` | When working on frontend architecture or data fetching |
| `OBSERVABILITY.md` | When adding logging, metrics, or tracing |
| `WORKTREE.md` | When working in parallel worktrees |
| `docs/design-docs/` | For specific design decisions and core beliefs |
| `docs/design-docs/core-beliefs.md` | For the team's operating principles |
| `docs/exec-plans/active/` | For currently in-progress plans |
| `docs/exec-plans/tech-debt-tracker.md` | For known technical debt items |
| `docs/product-specs/` | For product specifications and requirements |
| `docs/references/` | For external API docs and llms.txt files |
| `docs/generated/` | For auto-generated docs (db schema, API endpoints) |

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
| `/sync` | After significant code changes — re-analyze and update docs |
| `/review` | Before committing — architecture-aware code review |
| `/plan <task>` | Before starting complex work — create an execution plan |
| `/quality` | To grade each domain and update QUALITY_SCORE.md |
| `/ci-check` | After pushing — check CI status and diagnose failures |

## Agents — Delegate When Appropriate

| Agent | When to delegate |
|-------|-----------------|
| `@reviewer` | For thorough code review with architecture awareness |
| `@architect` | For analyzing architecture health and dependency mapping |
| `@gardener` | For finding stale docs, dead references, quality drift |

## Hooks — Run Automatically

Custom linters in `.claude/hooks/` run after every file edit and inject
remediation into context. You don't need to invoke them — they fire on PostToolUse.

## Principles

1. **This file is the map** — read linked docs on demand, don't load everything
2. **Repository is the system of record** — if it's not in the repo, it doesn't exist
3. **Enforce mechanically** — rules and hooks catch violations, not memory
4. **Progressive disclosure** — start here, follow pointers to the relevant doc
5. **Correct > clever** — well-tested, composable, boring code wins
```

## Adaptation Instructions

1. ALL commands, descriptions, and references must come from actual discovery
2. Only include knowledge base rows for docs that were ACTUALLY generated
3. Only include rules rows for rules that were ACTUALLY generated
4. Only include skills/agents that were ACTUALLY generated into the project
5. If the project already has CLAUDE.md, READ it first and MERGE — preserve user content
6. If monorepo, add a Packages section listing each package
7. The "How to Work in This Repo" section is CRITICAL — it tells Claude when to read what
8. The knowledge base table must say "When to read it", not just "What's there" — this drives progressive disclosure
