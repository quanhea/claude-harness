---
description: Generate docs/PLANS.md
outputs: ["docs/PLANS.md"]
---

# Task: Generate docs/PLANS.md

**Output:** `{{PROJECT_DIR}}/docs/PLANS.md`

You are creating `docs/PLANS.md` — the index and template reference for **execution plans**, which are first-class artifacts in this repo (alongside worktrees). Every non-trivial change starts with a plan file in `docs/exec-plans/active/<slug>.md`. Plans use nested checkbox tasks and a decision log so the next agent or session can resume work without re-deriving your reasoning.

This task does NOT generate individual plan files (those are written per change, not by setup). It generates PLANS.md, which contains:
1. An index of active + completed plans in the repo today.
2. The plan template agents copy from when starting new work.
3. The lifecycle (active → completed).
4. A light roadmap section if one is discoverable from README / git history.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest"
2. "List any existing files under `docs/exec-plans/active/` and `docs/exec-plans/completed/`"
3. "Check README for roadmap or near-term milestones"
4. "Check git log for themes that suggest in-flight work"
5. "Write docs/PLANS.md following the exact template"
6. "Verify the template section includes the full checkbox plan skeleton"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Template

```markdown
# Plans

Execution plans are **first-class artifacts** in this repo. Every non-trivial
change starts with a plan file committed to `docs/exec-plans/active/<slug>.md`
**before any code is written**. This page is the index and the template.

The harness-engineering pattern: plans with progress and decision logs are
checked into the repository alongside the code, so agents can resume work
without relying on external context.

## Active plans

{{list every file under `docs/exec-plans/active/` as `- [slug](exec-plans/active/slug.md) — <one-line summary from the plan's Context>` — or write `_No active plans. Start one by copying the template below into docs/exec-plans/active/<slug>.md._` if none.}}

## Completed plans

{{list every file under `docs/exec-plans/completed/` the same way — or `_No completed plans yet._`}}

## Tech debt tracker

See [`exec-plans/tech-debt-tracker.md`](exec-plans/tech-debt-tracker.md).

## Plan file template

When starting a non-trivial change, copy this skeleton into
`docs/exec-plans/active/<slug>.md` and commit it **before writing code**.
The slug should be short and hyphenated: `add-oauth-login`, `migrate-to-postgres-17`.

```markdown
# Plan: <short-title>

Owner: <handle or "unassigned"> Opened: <YYYY-MM-DD>

## Context

One paragraph. Why is this change being made? What prompted it? What's the intended outcome? A future reader should understand the motivation without reading any code.

## Approach

Two or three sentences. The chosen direction — not the exhaustive design. Link to a design doc in `docs/design-docs/` if one exists.

## Tasks

- [ ] Parent task 1 — one-line description
  - [ ] Subtask 1a
  - [ ] Subtask 1b
  - [ ] Subtask 1c
- [ ] Parent task 2
  - [ ] Subtask 2a
  - [ ] Subtask 2b
- [ ] Parent task 3
- [ ] Update tests
  - [ ] Unit tests for the new module
  - [ ] Integration test covering the golden path
- [ ] Update docs
  - [ ] `ARCHITECTURE.md` if module boundaries changed
  - [ ] Any affected `docs/*.md`
- [ ] Self-review the diff
- [ ] Open PR

Check boxes off as work completes. Add new tasks / subtasks freely as the plan evolves — plans are living documents.

## Decision log

Append an entry whenever you make a non-obvious choice or hit a surprise. Keep entries short; the goal is auditability, not prose.

- **YYYY-MM-DD** — Decision — One-line rationale.
- **YYYY-MM-DD** — Decision — One-line rationale.

## Verification

- [ ] Manual: <what to click / curl / observe>
- [ ] Automated: <which tests cover this>
- [ ] Review: <who or which @agent must approve>

## References

- Related design doc: `docs/design-docs/<file>.md`
- Related ticket / issue: <link>
- Prior plan this supersedes (if any): `docs/exec-plans/completed/<slug>.md`
```

## Lifecycle

1. **Start**: copy the template to `docs/exec-plans/active/<slug>.md`, fill
   in Context / Approach / initial Tasks, and commit. This is the handoff
   point — if you stop here, the next agent knows where to pick up.
2. **Work**: tick boxes as you go, append
   to the decision log on non-obvious choices, add new tasks when scope
   becomes clearer. The plan is a living document, not a pre-commitment.
3. **Complete**: when every task is checked and verification passes,
   `git mv docs/exec-plans/active/<slug>.md docs/exec-plans/completed/`
   in the same PR that ships the change. The completed/ directory is
   permanent history — never delete from it.

## When a plan is NOT required

- Single-line typo fixes
- Pure formatting / lint autofixes
- Reverting a single recent commit

Anything that spans more than one commit or touches more than one module
needs a plan. When in doubt, write one — they are cheap.

## Roadmap

{{if the README or issue tracker surfaces near-term direction, list it here under "Near term" / "Later". Otherwise write "_Not yet defined. Individual plans track in-flight work._"}}

_Updated: {{today's date}}._
```

## Rules

- The **Plan file template** section in PLANS.md is mandatory and non-negotiable — copy it verbatim from this prompt. It's the source of truth that agents copy from.
- The **Active plans** and **Completed plans** sections are dynamic — scan the two directories and write what you find. Do not invent entries.
- Keep the tone declarative; this is a process doc, not marketing.
- If `docs/PLANS.md` already exists, read it first and MERGE. Preserve any hand-curated Roadmap content or custom sections; only auto-refresh the Active/Completed indexes and the Plan template.
