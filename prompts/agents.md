---
description: Generate .claude/agents/ — subagent definitions for recurring scoped jobs
outputs: [".claude/agents/*.md"]
---

# Task: Generate `.claude/agents/` subagent definitions

**Output:** `{{PROJECT_DIR}}/.claude/agents/<name>.md`

A subagent is a scoped helper that runs inside a session with its own context window and its own tool limits. It earns its place when a job recurs across many different tasks and benefits from a **fresh context** — the main session has been staring at the change for an hour and has every reason to believe it works.

The canonical one is a verifier: it runs the app, exercises the change, and reports what it saw, without the main session's assumptions and without permission to fix anything. Separating "does it work" from "I wrote it" is most of the value.

This is not the same as the feedback loop. The loop runs continuously while the session works; a verifier runs once, at the end, in a clean context, to check the session's own belief that it is done.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent). If the root has no manifest but its immediate subdirectories do, this is an umbrella repo: detect each sub-project separately and treat the root as the cross-cutting layer"
2. "Read docs/VERIFY.md if present — the verifier's instructions should match the project's real verification lanes rather than inventing new ones"
3. "Find the exact command that runs this project locally, and what a healthy start looks like"
4. "Decide which subagents this project can actually support (see the bar below)"
5. "mkdir -p .claude/agents/ via Bash, then write one Markdown file per agent"
6. "Verify every command named in every agent exists in the project"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Important: directory creation

`.claude/` is a protected path. Run a Bash `mkdir -p .claude/agents` before writing.

## The bar

Write a subagent only when the job is **recurring**, **scoped**, and better done in a **fresh context**. A one-off does not need a definition; a job needing the main session's full context should stay in the main session.

Generate the **verifier** whenever step 3 found a way to run the project. Consider these only if the project's shape genuinely calls for them:

- A **reproducer** for projects with an incident or bug-report flow: given a report, reproduce the failure and report the minimal case, without fixing it.
- A **migration checker** for projects with database migrations: apply the migration against a scratch database, confirm it applies cleanly and is reversible, report the resulting schema diff.

Do not generate an agent whose tools this project cannot provide, and do not generate a generic "reviewer" — PR review is `REVIEW.md`'s job, running against the diff rather than inside the session that wrote it.

## Agent file shape

```markdown
---
name: {{name, matching the filename}}
description: {{when to use it — one sentence, concrete enough that the main session knows to reach for it}}
tools: {{the minimum set, e.g. Bash, Read}}
---

{{Imperative instructions. What to run, what to exercise, what to report.}}
```

## The verifier

```markdown
---
name: verifier
description: Runs the project and checks the change actually works, in a fresh context, before the session reports done
tools: Bash, Read
---

Start the project with `{{discovered run command}}`. {{What healthy startup
looks like, and what to do if it does not start — report that, do not debug it.}}

Exercise the changed behavior, then the two nearest neighboring flows — the
regression usually lands next door, not where the work happened.

Work out what to check from what the change claims, not from what is cheap to
run. State the claim in one sentence, name what would be observably different
if it holds, then use the instrument that can see *that* —
{{if docs/VERIFY.md exists: "the instrument table in `docs/VERIFY.md` lists what
this project has, and which classes it lacks"; otherwise: "the real commands
are " + the discovered test/build commands}}. A green test run is not evidence
for a claim about speed, memory, a leak, or anything visual.

Where the claim is quantitative, take the baseline too — a number with no
before is not a result.

Report what you ran, what you saw, and anything that does not match the plan.
Quote actual output rather than summarizing it as "passed".

**Do not fix anything.** You are a second pair of eyes, not a second author. If
something is broken, describe it precisely enough that the session can act; the
moment you start editing, the independent check is gone.
```

## Rules

- `tools:` lists the minimum. A verifier with Edit is not a verifier.
- Every command must be real. An agent that runs `make dev` in a project with no Makefile fails silently and gets deleted.
- "Report, do not fix" belongs in any read-only agent, stated explicitly — it is the constraint most likely to erode.
- Tell the reader to commit these: checked into git, the whole team gets them, and changes go through review like any other config.
- If step 3 found no way to run the project, write no verifier. Say so, and note that `docs/VERIFY.md` covers verification by other means.
- The verifier derives its checks from the change's claim. A verifier that runs a
  fixed command list is a slower CI job, and it will report success on every
  claim that list cannot observe.
