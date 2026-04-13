# Architecture

This document describes the high-level architecture of claude-harness.
If you want to familiarize yourself with the codebase, you are in the right place.

## Bird's Eye View

claude-harness is a CLI that scaffolds any project for agent-first development by
fanning out parallel Claude Code processes — one per setup task. The tool itself
does no analysis. All intelligence comes from Claude. Our job is orchestration:
spawn processes, handle failures, save progress.

The core loop is simple:

```
load TASK_MANIFEST → spawn N claude -p processes → collect results
```

All 28 tasks run in a single flat parallel pool. There are no phases, no gates, no
prerequisites. Each prompt is self-contained — it reads the project directly and, if
the task doesn't apply (e.g. frontend docs on a backend project), writes a short
stub and exits.

## Code Map

The entire source lives in `src/`. There are no subdirectories — the project
is small enough that flat is better.

### The Pipeline

These modules execute in sequence. `scanner.ts` calls them in this order:

```
cli.ts → scanner.ts → preflight.ts → state.ts → worker-pool.ts → reporter.ts
                                                      ↓
                                                 worker.ts
```

**`cli.ts`** — Entry point. Parses argv, dispatches to `setup()` (main mode) or
`gardenerCommand()` (gardener subcommand), sets exit code. The only module that
calls `process.exit()`.

**`scanner.ts`** — The orchestrator. Largest module; read this first after this file.
Wires together every other module: runs preflight, filters `TASK_MANIFEST` by `--only`,
initializes or resumes state, creates ONE `WorkerPool` with every pending task, subscribes
to pool events, handles SIGINT/SIGTERM, and generates the final report. Two signal handlers
live here (first Ctrl+C stops the queue; second kills all workers). There is no discovery
or project-type detection — prompts self-check.

**`preflight.ts`** — Validates that `claude` is installed and authenticated, the target
directory exists, and no other setup is running (via `harness.lock` in the output directory).
Creates the lock file on success, removes it when setup completes.

**`state.ts`** — Persistence layer. The run state (which tasks are pending, running,
completed, failed) is kept in memory as a `HarnessState` object and periodically flushed
to `.claude-harness/state.json`. All writes are atomic: write to a `.tmp` file, fsync,
then rename. On `--resume`, stale RUNNING entries are reset to PENDING. On `--resume --retry`,
FAILED/TIMEOUT entries are also reset so they get a fresh run.

### The Execution Engine

**`worker-pool.ts`** — Manages N concurrent claude child processes. Holds a queue of
pending task IDs and a map of active `ChildProcess` handles. When a worker finishes,
the pool dequeues the next task and launches a new worker. Adaptive concurrency: on
rate-limit errors it reduces parallelism by 1; after 5 consecutive successes it restores
it. Emits `start`, `done`, and `drain` events consumed by `scanner.ts`. One pool is
created per run and it drains once — there is no phase sequencing.

**`worker.ts`** — Contains `spawnTask()`, the shared core that spawns any `claude -p`
process. Builds CLI args (`--dangerously-skip-permissions`, `--max-turns`,
`--output-format json`, `--no-session-persistence`), pipes stdout/stderr to a log file,
runs a timeout timer, parses the JSON response for `is_error` and cost, and classifies
errors. The per-task spawn and any reporter invocations both go through this.

### Support Modules

**`prompt.ts`** — Loads a prompt template file from `prompts/` and replaces `{{VAR}}`
placeholders from a key-value map. Standard vars injected into every task:
`PROJECT_DIR`, `OUTPUT_DIR`, `TASK_ID` — nothing else. Each prompt does its own
project detection.

**`progress.ts`** — Terminal output. In TTY mode: in-place progress bar with per-worker
status, updated every 500ms. In non-TTY mode (CI, piped): simple timestamped log lines.

**`reporter.ts`** — Reads completed task state and writes `setup-report.md` to the output
directory, summarizing which tasks completed, failed, or were skipped with timing information.

**`types.ts`** — Shared type definitions: `STATUS` enum, `TaskEntry`, `HarnessState`,
`TaskDefinition`, `TASK_MANIFEST` (the unordered 28-task list), and `DEFAULTS`. This
is the single source of truth for what the harness runs.

### Gardener Modules

**`gardener.ts`** — Runs the doc-freshness audit for one project. On first run:
spawns parallel Explore agents (one per tracked doc) to verify every file path,
type, command, and reference against the live code.
On subsequent runs: diffs `LAST_COMMIT..HEAD`, maps changed files to feature areas, and
only re-audits docs that reference the changed files, and commits fix-up edits
in place. It never creates a separate encyclopedia directory — the blog uses
"encyclopedia" as a metaphor for a bloated AGENTS.md, not as a path.

**`gardener-api.ts`** — Manages `~/.claude-harness/projects.json`, the global registry
of projects the gardener tracks. Provides `add`, `remove`, `list`, `run`, and
`updateLastRun` operations. All writes are atomic (same write-fsync-rename pattern as
`state.ts`). Dispatches `gardener run` to `gardener.ts`.

## Architectural Invariants

These are the rules that hold across the codebase. If a change violates one, it's a bug.

- **No module except `cli.ts` calls `process.exit()`.** The orchestrator returns an
  exit code; the CLI is responsible for exiting. Signal handlers in `scanner.ts` are the
  only exception (force-quit on double Ctrl+C).

- **All tasks run in one flat pool.** The orchestrator creates a single `WorkerPool`
  and awaits its drain. There are no phases, no gates, no cross-task dependencies —
  each prompt does its own project detection and decides its own applicability.

- **Worker stdout/stderr is never buffered in memory.** It is piped directly to a file
  write stream. This is how we can run 29 tasks with full Claude context windows without
  memory pressure.

- **State writes are always atomic.** Write to `.tmp`, fsync, rename. No module writes
  to `state.json` directly. All writes go through `saveState()`.

- **Each task maps to exactly one worker at a time.** The pool's queue ensures no task
  is assigned to two workers simultaneously.

- **Output directory is separate from the target project.** All harness output goes to
  `.claude-harness/` (or `--output`). Generated project files are written by the Claude
  subprocess into the target directory — the orchestrator never writes there directly.

- **`claude` invocations use `--no-session-persistence`.** This prevents Claude from
  saving a session file per invocation — important when spawning 29 processes. The flag
  also ensures each task starts with a clean context.

- **Task IDs are semantic slugs.** `"claude-md"`, `"architecture-md"`, `"rule-git"`,
  ... The `TASK_MANIFEST` in `types.ts` is the single source of truth. No other module
  hardcodes task IDs — numeric prefixes are never used because the execution is unordered.

## Cross-Cutting Concerns

**Prompts self-check.** Tasks that only apply under certain conditions (frontend-only,
app-only, non-greenfield) include a `Skip if ...` clause at the top. The prompt itself
decides — no orchestrator intelligence is required. This keeps the orchestrator a dumb
parallel runner.

**Error classification.** When a worker fails, `spawnTask()` parses the JSON response
and classifies the error (`rate_limit`, `overloaded`, `auth_error`, `generic`). This
drives retry behavior in `scanner.ts` and adaptive concurrency in `worker-pool.ts`.

**Rate limit auto-pause.** When a 429 rate limit is detected, the orchestrator pauses
the pool, requeues the failed task, and retries after a backoff delay (parsed from the
error or defaulting to 15 minutes). No manual intervention needed.

**Graceful shutdown.** Signal handling spans `scanner.ts` (registers handlers, decides
graceful vs. force) and `worker-pool.ts` (implements `stopAcceptingNew` and `killAll`).
The pool doesn't know about signals — it just exposes controls that the scanner calls.

**State checkpoints.** `scanner.ts` saves state on three triggers: after each worker
completes, every 30 seconds via `setInterval`, and on process exit. The 30-second
checkpoint limits progress loss on SIGKILL to at most 30 seconds of completed work.

**Gardener registry.** The gardener uses a global registry at `~/.claude-harness/projects.json`
that persists across runs and projects. Same atomic-write guarantees as `state.ts`. The
registry is intentionally simple: path, cron schedule, last-run timestamp, last worktree
commit. The cron schedule is set at registration and honored by the CronCreate hook in
`prompts/gardener.md`.

## Testing

Tests use Node.js built-in `node:test` and `node:assert`. No mocking frameworks.
A mock `claude` script in `test/fixtures/mock-claude/` acts as a drop-in replacement —
it outputs a successful JSON envelope for any `-p` invocation. Integration tests
prepend this fixture to `PATH` so the real `claude` is never called.
