# claude-harness

TypeScript CLI that scaffolds any project for agent-first development.

Spawns one `claude -p` process per setup task — 28 tasks, flat parallel — so each step
gets its own focused context window. No one prompt tries to do everything.

## Background

The [Harness Engineering](https://openai.com/index/harness-engineering/) article describes
a complete system: CLAUDE.md as a ~100-line table of contents, a `docs/` knowledge base,
custom linters as hooks, rules enforced mechanically, project-specific skills generated
from conversation history, and a recurring gardener that scans every tracked doc
for references that no longer match the live code and commits fix-up edits.

The original approach was a monolithic skill — one 100-line `SKILL.md` that tried to
generate 20+ files in a single Claude session. The problem: too much in one prompt gets
overlooked. Sections merge. Files get skipped. Quality is uneven.

**claude-harness is the task-parallel implementation.** Each of the 29 setup tasks gets
its own subprocess, its own focused prompt, and the full context window. The orchestrator
handles the boring parts — phase sequencing, parallel execution, crash recovery, progress
display — so each Claude invocation can do one thing well.

## Install

```bash
npm install -g @eastagile/claude-harness
```

Prerequisites:
- Node.js 18+
- [Claude Code](https://code.claude.com/docs/en/quickstart) installed and authenticated (`claude auth login`)

## Quick Start

```bash
# Scaffold a project
claude-harness ./my-project

# Preview which tasks would run
claude-harness ./my-project --dry-run

# Run with more parallelism
claude-harness ./my-project --parallel 8

# Run only specific tasks (forces re-run even if already completed)
claude-harness ./my-project --only claude-md,rule-git

# Re-run after upgrading claude-harness — auto-picks up any new tasks
claude-harness ./my-project

# Retry failed / timed-out tasks
claude-harness ./my-project --retry
```

## How It Works

```
load TASK_MANIFEST → spawn N claude -p processes → collect results
```

All 28 tasks run in one flat parallel pool (up to `--parallel` concurrent workers,
default 6). There are no phases, no gates, no cross-task dependencies.

Each prompt is self-contained: it reads the project directly (`package.json`, source
files, git log) and, if the task doesn't apply to this project, writes a one-line
stub and exits. For example, `design.md` skips itself on a backend-only project.

When all tasks drain, the orchestrator writes `setup-report.md` with timing and status
for every task.

Each Claude invocation uses `--dangerously-skip-permissions` so the task can read the
project and write output files without confirmation prompts.

## Output

Results from the orchestrator go to `.claude-harness/` (or `--output <dir>`):

```
.claude-harness/
├── setup-report.md     # Task summary with timing
├── state.json          # Run state (powers re-run / --retry / --only)
└── logs/               # Claude stdout+stderr per task
```

Generated project files are written directly into the target project by each task's
Claude subprocess:

```
CLAUDE.md                          # Table of contents (~100 lines)
ARCHITECTURE.md                    # Module map and invariants
GIT_WORKFLOW.md                    # Branching, commit, PR conventions
INFRASTRUCTURE.md                  # Services, CI/CD, databases
QUALITY_SCORE.md                   # Quality grades per domain
PLANS.md                           # Active / completed execution plans
PRODUCT_SENSE.md                   # Domain terminology and UX conventions
RELIABILITY.md                     # Error handling, SLAs, observability
SECURITY.md                        # Auth, data handling, secrets

.claude/
├── settings.json                  # Tool permissions
├── rules/                         # Architecture, testing, doc, git rules
├── hooks/                         # Custom linter scripts (PostToolUse)
└── skills/                        # /sync, /review + project-specific skills

docs/
├── design-docs/core-beliefs.md
├── exec-plans/tech-debt-tracker.md
└── generated/                     # Auto-generated docs (db-schema, api-routes, ...)
```

## Options

```
  -j, --parallel <n>       Parallel workers per phase   (default: 6)
  -t, --timeout <seconds>  Per-task timeout             (default: 1800)
      --resume             (legacy no-op — every run is a resume now)
      --retry              Also re-run failed/timed-out tasks
      --only <ids>         Run ONLY these task IDs and force re-run even if they already completed (comma-separated, e.g. claude-md,rule-git)
  -o, --output <dir>       Output directory             (default: .claude-harness)
      --model <model>      Claude model to use
      --max-turns <n>      Max Claude turns per task    (default: 100)
      --dry-run            List tasks without running
      --force              Override harness lock
  -v, --verbose            Verbose output
```

## Re-running

State is saved atomically (write temp file → fsync → rename) after every task completes
and every 30 seconds. **Every invocation of `claude-harness` behaves as a safe re-run** —
no `--resume` flag required:

```bash
claude-harness ./my-project          # pick up any pending / stale / newly-added tasks
claude-harness ./my-project --retry  # also re-run failed or timed-out tasks
claude-harness ./my-project --only claude-md,rule-git   # force re-run of specific tasks
```

On each run the orchestrator:

1. Loads existing `state.json` if present (no interactive prompt).
2. Auto-merges any task IDs that are in the current `TASK_MANIFEST` but not in
   state — so upgrading claude-harness and re-running picks up new tasks without
   any extra step.
3. Resets stale RUNNING entries (from a crashed previous process) to PENDING.
4. Runs whatever is PENDING.

Completed tasks are preserved across runs. Use `--only` to explicitly regenerate
a specific file; that flag forces the listed task(s) back to PENDING even if
they already completed.

**Signal handling:**
- 1st Ctrl+C — stops the queue, waits for running tasks to finish
- 2nd Ctrl+C — kills all workers immediately, saves state, exits

**Signal handling:**
- 1st Ctrl+C — stops the queue, waits for running tasks to finish
- 2nd Ctrl+C — kills all workers immediately, saves state, exits

## Gardener

The gardener runs as a background cron job and keeps the project's existing docs
(CLAUDE.md, ARCHITECTURE.md, `docs/**/*.md`) fresh against the live code. On the
first run it spawns parallel Explore agents — one per doc — to audit every
reference. On subsequent runs it diffs the code since the last run and only
re-audits docs that mention the changed files. It commits the fix-ups in place.

```bash
claude-harness gardener add ./my-project                           # Register + schedule
claude-harness gardener add ./my-project --schedule "0 9 * * 1-5" # Custom cron
claude-harness gardener remove ./my-project
claude-harness gardener list
claude-harness gardener run ./my-project                           # Run immediately
```

The registry lives at `~/.claude-harness/projects.json`.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for a guide to the codebase.

## License

MIT — see [LICENSE](LICENSE).
