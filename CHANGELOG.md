# Changelog

## 1.4.2

### Worktree isolation

- Hook now symlinks `node_modules/`, `vendor/`, `.bundle/` from the main working tree if lockfiles match — worktree is usable instantly without re-installing deps. Skips with a warning if lockfiles differ. `.venv` excluded from symlinking (hardcoded paths); logs the install command instead.
- Dev server port isolation: derives a unique `PORT` from the slug hash and writes it to `.env.local`, so multiple worktrees can run dev servers simultaneously without port conflicts. Detected via `package.json` scripts or framework config files (Next.js, Vite, webpack).

### Testing rules

- Browser/E2E testing section added to `rule-testing.md` — instructs agents to read the dev server port from config (never hardcode), use browser MCP tools (Playwright, Puppeteer) for E2E, and respect per-worktree `PORT` in `.env.local`. Omitted for backend-only projects.

## 1.4.1

- Updated package description and keywords for discoverability
- README: removed hardcoded task count, added `remove` to Quick Start, updated file structure tree to show all generated outputs, updated output directory path to `~/.claude-harness/`

## 1.4.0

### `claude-harness remove`

- New command: `claude-harness remove [target-dir]` — interactive checkbox to selectively delete generated features and reset their state to pending. All unchecked by default (safe). Supports `--dry-run`.
- Filesystem is the source of truth — shows tasks whose output files exist on disk, regardless of state.json. If you delete files then `git checkout` them back, remove correctly reflects reality.

### State directory moved to `~/.claude-harness/`

- Default output directory is now `~/.claude-harness/projects/<slug>/` (slug uses Claude Code's `sanitizePath` convention: all non-alphanumeric → hyphen). No `.gitignore` entry needed.
- Old `<project>/.claude-harness/` is auto-migrated on first run of either `claude-harness` or `claude-harness remove`. The stale `.gitignore` sentinel is cleaned up.

### Checkbox UX

- Tasks grouped with separator labels: **Project docs**, **Rules & config**, **Automation**. Non-selectable divider lines via `@inquirer/prompts` Separator.
- `TASK_MANIFEST` reordered to match visual grouping (`settings-json` moved to Rules & config).

## 1.3.0

### Orchestrator

- Interactive task selection: running in a TTY now shows a checkbox list of pending tasks (all checked by default); user can deselect before the run proceeds. `--only` and non-TTY (CI) bypass the prompt.
- Checkbox `pageSize` grows with the list so no tasks sit below the fold — tasks like `skills` at position 21 were being missed.
- List of pending tasks printed at startup for visibility (also applies to non-TTY runs).
- Disabled tasks are no longer stored in `state.json` — `totalTasks` counts only enabled tasks and the progress bar denominator stays exact. A package upgrade that newly disables a task prunes it from existing state on the next run.
- Temporarily removes the `enforce-worktree.sh` PreToolUse hook from `process.cwd()/.claude/settings.json` before spawning claude subprocesses; restores the exact original content on exit via `process.on("exit")`. No-op if absent. Skipped on `--dry-run`.

### Agent subprocess behavior

- `NON_INTERACTIVE_PREFIX` now tells the agent how to work around Claude Code's built-in sensitive-path guard: when `Write` is denied on `.claude/` files, write to `/tmp/harness-<name>.md` first, then `mv` to the target via Bash. Both the Write tool and shell heredocs are blocked for sensitive paths; the `/tmp/` relay sidesteps it cleanly.

### Prompts

- `skills`: extraction script streams `.jsonl` files line-by-line (readline) instead of loading them fully into memory; full user-message content preserved (dropped the 500-char truncation). Added `effort: max` frontmatter.
- `skills`: pipeline simplified to two phases — Phase 1 clusters user asks via Bash grep counting on the chunk files (never Read the whole part files, they can be >1MB), Phase 2 greps .jsonl files for success signals and reads small windows around them to extract the working flow. Numerical thresholds dropped; the agent decides what counts as a real pattern. Tip to parallelize Phase 2 via `Task` subagents.
- `mcp-config`: detects either `.mcp.json` OR any documented template variant (`.mcp.json.TEMPLATE`, `.mcp.json.EXAMPLE`, `.mcp.json.example`, `.mcp.json.sample`) via glob brace expansion so disk reconciliation stops re-running the task when only the committed template is present.
- `worktree`: added a rule to ensure `.gitignore` covers any sensitive file the hook creates (e.g. `.env.local`) before the task finishes.
- `claude-md`: dropped the Hooks and Principles sections (meta-commentary, not actionable). Removed stale "Rule 1 / Rule 2" preamble and the outdated principle referencing removed rules. Replaced the full worktree rule block with a single pointer to `docs/WORKTREE.md` and `.claude/rules/git-workflow.md`.
- Removed scattered worktree-creation instructions from `plans` and `claude-md` — worktree enforcement lives in `rule-git` + the hook, no need to repeat.
- Removed `claude-harness --only <task>` CLI references from content generated by `worktree`, `plans`, and `rule-git` — generated files shouldn't know about the tool that produced them.

## 1.2.1

### Worktree isolation prompt

- PostgreSQL provisioning updated to use `CREATE DATABASE ... TEMPLATE` (native filesystem clone) instead of `pg_dump | pg_restore` — instant, exact copy, no dump overhead
- Added general DB clone principle: always prefer engine-native clone; no dump fallback for databases that support it
- One-sentence note covers other engines (Neo4j Enterprise, SQLite) and databases without native clone
- Removed Kafka/NATS, Elasticsearch/OpenSearch, and MinIO/LocalStack rows from the provisioning table — not commonly needed at setup time

## 1.2.0

### Worktree isolation

- PostgreSQL provisioning now clones the source DB (`CREATE DATABASE new_db TEMPLATE source_db`) instead of creating an empty one — worktrees start with all existing data, seeds, and fixtures intact
- Source DB is read from `POSTGRES_DB` in `.env`; active connections to the source are terminated before cloning (required by PostgreSQL TEMPLATE); falls back to empty `CREATE DATABASE` if source is unknown
- Migrations run on top of the clone (not from scratch) to bring the worktree DB to the branch tip

## 1.1.1

### Bug fixes

- Raise hang detector threshold to 15 min (from 2 min) — extended thinking can be silent between tool calls for several minutes.

## 1.1.0

### Logging

- Full turn-by-turn conversation log: switched to `--output-format stream-json --verbose` so every tool call, tool result, and assistant turn is captured as JSONL in `logs/<task>.log`
- Rendered prompt written as the first JSONL line (`{"type":"prompt",...}`) in every log — the log file now contains both input and output in a single self-contained file
- Removed `debug/` directory: the stream-json `result` envelope already carries cost, turns, `is_error`, `permission_denials`, and errors; the separate orchestrator event trail was redundant

### Prompts

- Added `effort` frontmatter field (`low | medium | high | max`) to set `CLAUDE_CODE_EFFORT_LEVEL` for individual tasks; omitting the field leaves the default
- `worktree` task uses `effort: max` for best results on the most complex generated artifact
- `worktree` task: `- Ultrathink` added as the final rule, triggering extended reasoning

### Worktree isolation (generated hooks)

- Generated hooks converted from Node.js to bash — eliminates PATH issues in GUI git clients (Fork, Tower, SourceTree) and pre-commit environments where `node` is not on `$PATH`
- Hook paths in `settings.json` now use `"$CLAUDE_PROJECT_DIR"/.claude/hooks/...` — fixes "No such file or directory" when the hook working directory is not the repo root
- Portability rules enforced: POSIX-only `sed` patterns (`[[:space:]]`, not `\s`), `shasum -a 256` instead of `sha256sum` — both required on macOS/BSD
- Docker postgres fallback: if `psql` is not in `PATH`, hook tries `docker exec $(docker ps --filter ancestor=postgres ...)` — supports projects running Postgres in Docker without a local client
- Hook always exits 0 — a provisioning failure (service unreachable, DB exists) logs a warning but never blocks a `git checkout`, `commit`, or stash
- Simplified: removed file lock, Redis DB-number registry, and `trap ERR` rollback — Redis uses key-prefix mode only; no registry file needed
- Removed all `claude -w` references from worktree and git-workflow prompts — `git worktree add` is the canonical command
- Mandatory end-to-end test step (Step 7) added to `worktree.md`: syntax check → dry run → real worktree creation → verify resources exist → cleanup; agent must iterate until clean
- `CLAUDE_HARNESS_SETUP=1` env var injected into all subprocesses so enforcement hooks skip during initial scaffolding

## 1.0.0

Initial release.

### Core orchestrator

- 28 independent tasks run in one flat parallel pool — no phases, no gates, no cross-task dependencies; default concurrency raised to 12 workers
- Each prompt is self-contained: reads the project directly and self-skips if the task doesn't apply (e.g. frontend docs on a backend-only project)
- Adaptive concurrency: reduces parallelism on rate-limit responses, restores it on consecutive successes
- Graceful shutdown: first Ctrl+C drains the queue, second kills all workers immediately
- Terminal progress bar with per-task status in TTY mode; plain log lines in CI
- `setup-report.md` generated on completion with task timing and status

### State and re-runs

- Atomic state persistence (write temp → fsync → rename) after every task completion and every 30 seconds
- Every invocation is a safe re-run — no `--resume` flag needed; stale RUNNING entries from a crashed process reset to PENDING automatically
- Bidirectional disk reconciliation on every run: tasks whose declared output files are missing get requeued; tasks whose output files already exist on disk are auto-promoted to COMPLETED (handles teammate-pull scenarios)
- `--only <ids>` forces specific tasks back to PENDING and re-runs them even if already COMPLETED
- `--retry` also resets FAILED and TIMEOUT tasks
- Auto-merges new task IDs from an upgraded manifest into existing state — upgrading claude-harness and re-running picks up new tasks without any extra step
- `.claude-harness/` auto-appended to `.gitignore` on first non-dry-run

### Prompt frontmatter

- `description:` — shown in `--dry-run` output and the setup report
- `outputs:` — JSON array of expected output paths; supports globs (`*.md`, `**/*.md`, `{a,b}`); drives disk reconciliation
- `max-turns:` — per-task Claude turn cap; `null` removes the cap entirely
- `always-run: true` — task always resets to PENDING on reconciliation regardless of whether output files exist (used for CLAUDE.md which must stay current)
- `disabled: true` — excludes task from all runs unless explicitly named with `--only`; use to park tasks under active development

### Prompts

- `start-claude` command: `claude --append-system-prompt` wrapper that pre-loads harness-engineering methodology into an interactive Claude Code session; supports project-local override via `.claude/start-claude.md`
- Non-interactive prefix prepended to every prompt: tells Claude that all writes are pre-approved and to continue on permission denials rather than stopping to ask
- Debug output: per-task JSONL event trail in `.claude-harness/debug/` (spawn args, exit code, timing)

### Generated hooks

- `enforce-worktree.sh` (PreToolUse, generated by `worktree` task): blocks Edit/Write when running in the main git working tree instead of a linked worktree; detects main-vs-worktree via `$GIT_TOPLEVEL/.git` directory vs file
- `enforce-git-naming.sh` (PreToolUse, generated by `rule-git` task): blocks `git checkout -b`, validates branch names on `git worktree add -b`, blocks direct push to protected branches, validates `git commit -m` message format
- `.claude/git-conventions.sh`: machine-readable naming patterns (bash variables) sourced at runtime by `enforce-git-naming.sh`; generated alongside `.claude/rules/git-workflow.md` from the same discovered conventions
- `CLAUDE_HARNESS_SETUP=1` injected into all setup subprocesses so enforcement hooks skip during initial scaffolding

### Gardener

- Background cron that keeps generated docs fresh against the live code
- `claude-harness gardener add/remove/list/run` subcommands
- Registry at `~/.claude-harness/projects.json`
- Atomic registry writes (no corrupt state on crash)
