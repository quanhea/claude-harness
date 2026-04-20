# claude-harness

Harness engineering for Claude Code — scaffold any project for agent-first development in one parallel run.

A coding agent harness that generates CLAUDE.md, architecture docs, rules, hooks, and skills from parallel Claude Code prompts. Each task gets its own focused context window. No one prompt tries to do everything.

## Background

The [Harness Engineering](https://openai.com/index/harness-engineering/) article describes
a complete system: CLAUDE.md as a ~100-line table of contents, a `docs/` knowledge base,
custom linters as hooks, rules enforced mechanically, project-specific skills generated
from conversation history, and a recurring gardener that scans every tracked doc
for references that no longer match the live code and commits fix-up edits.

The original approach was a monolithic skill — one 100-line `SKILL.md` that tried to
generate 20+ files in a single Claude session. The problem: too much in one prompt gets
overlooked. Sections merge. Files get skipped. Quality is uneven.

**claude-harness is the task-parallel implementation.** Each setup task gets
its own subprocess, its own focused prompt, and the full context window. The orchestrator
handles the boring parts — parallel execution, crash recovery, progress display — so each
Claude invocation can do one thing well.

## Install

```bash
npm install -g @eastagile/claude-harness
```

Prerequisites:
- Node.js 18+
- [Claude Code](https://code.claude.com/docs/en/quickstart) v2.1.78+ installed and authenticated (`claude auth login`)

## Quick Start

The target directory defaults to the current directory — run from inside your project:

```bash
cd ~/code/my-project

# Scaffold (default: current directory)
claude-harness

# Preview which tasks would run
claude-harness --dry-run

# Run with more parallelism
claude-harness --parallel 8

# Run only specific tasks (forces re-run even if already completed)
claude-harness --only claude-md,rule-git

# Re-run after upgrading claude-harness — auto-picks up any new tasks
claude-harness

# Retry failed / timed-out tasks
claude-harness --retry

# Selectively remove generated features
claude-harness remove

# Or pass a path explicitly
claude-harness /path/to/project
```

## How It Works

```
load TASK_MANIFEST → spawn N claude -p processes → collect results
```

All tasks run in one flat parallel pool (up to `--parallel` concurrent workers,
default 12). There are no phases, no gates, no cross-task dependencies.

Each prompt is self-contained: it reads the project directly (`package.json`, source
files, git log) and, if the task doesn't apply to this project, writes a one-line
stub and exits. For example, `design.md` skips itself on a backend-only project.

When all tasks drain, the orchestrator writes `setup-report.md` with timing and status
for every task.

Each Claude invocation uses `--dangerously-skip-permissions` so the task can read the
project and write output files without confirmation prompts.

## Output

Orchestrator state lives at `~/.claude-harness/projects/<slug>/` (not in the project dir — no `.gitignore` entry needed):

```
~/.claude-harness/projects/-Users-you-code-my-project/
├── state.json          # Run state (powers re-run / --retry / --only)
└── logs/               # Full conversation log per task (JSONL: prompt + stream-json events)
```

Team members running `claude-harness` against a repo that already has the
generated output files (CLAUDE.md, ARCHITECTURE.md, etc.) will see those tasks
auto-detected as COMPLETED via disk reconciliation; only the missing ones re-run.

Generated project files are written directly into the target project by each task's
Claude subprocess:

```
── Project docs ──
CLAUDE.md                                # Table of contents — the agent's entry point
ARCHITECTURE.md                          # Module map, layers, dependency rules
docs/
├── GIT_WORKFLOW.md                      # Branching, commit, PR conventions
├── PLANS.md                             # Execution plan template and lifecycle
├── INFRASTRUCTURE.md                    # Services, CI/CD, databases
├── PRODUCT_SENSE.md                     # Domain terminology and UX conventions
├── RELIABILITY.md                       # Error handling, SLAs, observability
├── SECURITY.md                          # Auth, data handling, secrets
├── QUALITY_SCORE.md                     # Quality grades per domain
├── OBSERVABILITY.md                     # Logging, metrics, tracing
├── DESIGN.md                            # High-level system design
├── FRONTEND.md                          # Frontend conventions (if applicable)
├── WORKTREE.md                          # Worktree-first dev, per-worktree service isolation
├── design-docs/core-beliefs.md          # Team operating principles
└── exec-plans/tech-debt-tracker.md      # Known technical debt backlog

── Rules & config ──
.claude/
├── settings.json                        # Tool permissions
├── rules/
│   ├── architecture.md                  # Module boundary rules
│   ├── testing.md                       # Test conventions
│   ├── documentation.md                 # Doc update rules
│   └── git-workflow.md                  # Git naming + worktree enforcement
├── git-conventions.sh                   # Machine-readable naming patterns

── Automation ──
├── hooks/
│   ├── post-checkout.sh                 # Worktree isolation provisioning
│   ├── worktree-cleanup.sh              # Stale worktree resource cleanup
│   ├── enforce-worktree.sh              # PreToolUse: block edits outside worktrees
│   └── enforce-git-naming.sh            # PreToolUse: validate branch/commit naming
├── skills/                              # Project-specific skills from conversation history
└── .mcp.json                            # MCP server recommendations
```

## Options

```
  -j, --parallel <n>       Parallel workers per phase   (default: 12)
  -t, --timeout <seconds>  Per-task timeout             (default: 1800)
      --resume             (legacy no-op — every run is a resume now)
      --retry              Also re-run failed/timed-out tasks
      --only <ids>         Run ONLY these task IDs and force re-run even if they already completed (comma-separated, e.g. claude-md,rule-git)
  -o, --output <dir>       Output directory             (default: ~/.claude-harness/projects/<slug>)
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
claude-harness                              # pick up any pending / stale / newly-added tasks
claude-harness --retry                      # also re-run failed or timed-out tasks
claude-harness --only claude-md,rule-git    # force re-run of specific tasks
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

## Start Claude

After scaffolding a project, start an interactive Claude Code session pre-loaded with harness methodology context. Defaults to the current directory:

```bash
# From inside your project
claude-harness start-claude

# Pass extra args to the claude binary
claude-harness start-claude -- --model claude-opus-4-6

# Or point at a specific project
claude-harness start-claude /path/to/project
```

This uses `claude --append-system-prompt` to inject a harness-engineering primer into the session — repository as system of record, CLAUDE.md as table of contents, plans as first-class artifacts — without replacing Claude Code's built-in tools.

Projects can override the bundled prompt by placing a custom `.claude/start-claude.md` in the project root.

## Gardener

The gardener runs as a background cron job and keeps the project's existing docs
(CLAUDE.md, ARCHITECTURE.md, `docs/**/*.md`) fresh against the live code. On the
first run it spawns parallel Explore agents — one per doc — to audit every
reference. On subsequent runs it diffs the code since the last run and only
re-audits docs that mention the changed files. It commits the fix-ups in place.

```bash
claude-harness gardener add .                           # Register current project
claude-harness gardener add . --schedule "0 9 * * 1-5" # Custom cron schedule
claude-harness gardener list                            # Show all registered projects
claude-harness gardener run .                           # Run immediately
claude-harness gardener remove /path/to/project         # Unregister
```

The registry lives at `~/.claude-harness/projects.json`.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for a guide to the codebase.

## License

MIT — see [LICENSE](LICENSE).
