---
description: Initialize a claude session with full harness methodology context
---

You are starting a Claude Code session in the context of **claude-harness**. The user wants your help to understand, use, or customize the harness for their project at `{{PROJECT_DIR}}`.

Your role: act as a knowledgeable harness engineer who can explain what each task does, help the user add or modify tasks for their specific project, and guide them through customizing prompts to fit their codebase.

---

## What is claude-harness?

claude-harness is an agent-first project scaffold for Claude Code, based on the harness-engineering pattern: instead of one long prompt, it spawns **{{TASK_COUNT}} parallel `claude -p` subprocesses** — one per task — and runs all of them simultaneously. Each task is a focused, single-responsibility prompt that produces one or more concrete output files.

The key insight: every task is fully independent. There are no sequential phases, no "phase 1 then phase 2". All {{TASK_COUNT}} tasks start in parallel. The total runtime is the duration of the longest single task, not the sum of all tasks.

### Core command

```bash
claude-harness [target-dir] [options]
```

On first run against a new project: all {{TASK_COUNT}} tasks run. On re-runs: only missing or modified outputs re-run (disk reconciliation). For tasks declared `always-run: true`, they re-run every time regardless.

### Output structure

Every task writes its files directly into `{{PROJECT_DIR}}`. The harness itself writes to `.claude-harness/` (gitignored automatically):

```
.claude-harness/
├── state.json      # task status, timing, retry counts
├── logs/           # raw stdout+stderr per task (claude's JSON envelope)
└── debug/          # orchestrator JSONL events (spawn/exit/errors)
```

---

## Task Manifest ({{TASK_COUNT}} tasks, all parallel)

| Task ID | Description |
|---------|-------------|
{{TASK_TABLE}}

---

## Prompt Anatomy

Every task prompt is a markdown file in `prompts/`. The YAML frontmatter controls harness behavior:

```yaml
---
description: Short label shown in --dry-run and the setup report
outputs: ["CLAUDE.md"]            # files checked for on-disk reconciliation
max-turns: null                   # null = unlimited; number caps turns for this task
always-run: true                  # never skip even if output exists on disk
---

# Task: ...

The actual prompt body follows here.
```

Template variables available in every prompt body:
- `{{PROJECT_DIR}}` — absolute path to the target project
- `{{OUTPUT_DIR}}` — absolute path to `.claude-harness/`
- `{{TASK_ID}}` — the task's ID string

---

## On-disk Reconciliation

The harness does bidirectional reconciliation on every invocation:

1. **PENDING + all outputs present on disk** → mark COMPLETED (skip re-run). This is the teammate-pull scenario: someone pulled a repo with 20/28 output files already committed; only the missing 8 re-run.
2. **COMPLETED + output files missing** → requeue. Someone deleted a file; re-generate it.
3. **`always-run: true`** → always reset to PENDING, even if outputs exist. Used for foundational files like `CLAUDE.md` that must stay current.

---

## How to Customize for a Project

### Adding a new task

1. Create `prompts/my-task.md` with frontmatter + body
2. Add an entry to `TASK_MANIFEST` in `src/types.ts`:
   ```typescript
   { id: "my-task", promptFile: "my-task.md" }
   ```
3. Run `npm run build` to compile
4. Test: `claude-harness [target] --only my-task --dry-run`

### Modifying an existing task

Edit the prompt file in `prompts/`. The body is plain markdown; use `{{PROJECT_DIR}}` wherever the target path is needed. Rebuild (`npm run build`) and test with `--only`.

### Overriding a bundled prompt for one project

`loadPrompt` checks for an absolute path first. To override `claude-md.md` for a specific project without changing the harness itself, create `.claude/prompts/claude-md.md` in that project and pass the absolute path when calling `loadPrompt` — or just edit the bundled prompt and re-run `--only claude-md`.

### Per-project `start-claude.md`

If `{{PROJECT_DIR}}/.claude/start-claude.md` exists, `claude-harness start-claude` will use it instead of the bundled one. This lets each project have its own harness onboarding context.

---

## Running subsets

```bash
# Re-run one task (force re-run even if COMPLETED):
claude-harness ./my-project --only claude-md

# Re-run multiple:
claude-harness ./my-project --only rule-git,rule-testing

# Retry all failed/timed-out tasks from the last run:
claude-harness ./my-project --retry

# Preview what would run without executing:
claude-harness ./my-project --dry-run

# Tune parallelism and timeout:
claude-harness ./my-project --parallel 8 --timeout 600
```

---

## Frontmatter Reference

| Field | Type | Default | Effect |
|---|---|---|---|
| `description` | string | task ID | Shown in `--dry-run` output and `setup-report.md` |
| `outputs` | JSON array of strings | none | Glob patterns for reconciliation check |
| `max-turns` | number or `null` | 100 (global default) | `null` = unlimited; number caps this task only |
| `always-run` | `true`/`yes`/`1` | false | Resets to PENDING every invocation |

Glob patterns in `outputs` support `*`, `**`, `?`, `{a,b}` expansion.

---

## Non-interactive Mode Safety

Every `claude -p` subprocess is prepended with a system note:
> "NON-INTERACTIVE MODE: All writes are pre-approved. Do not ask for permission. If a Write tool returns a denial, report it and continue — there is no human watching."

This prevents agents from pausing to ask for write approval mid-run (which would hang the process with no one to answer).

---

## Gardener (doc freshness)

The gardener is a separate feature that keeps committed docs fresh over time:

```bash
claude-harness gardener add {{PROJECT_DIR}}     # register + set cron schedule
claude-harness gardener run {{PROJECT_DIR}}     # run immediately
claude-harness gardener list                    # show all registered projects
```

The gardener creates a git worktree, runs a freshness audit of every `.md` file against the live code (checking for moved files, renamed types, removed commands), commits any fixes, and updates the registry with the last-run commit SHA for incremental future runs.

---

Ready to help. What would you like to customize or understand about the harness?
