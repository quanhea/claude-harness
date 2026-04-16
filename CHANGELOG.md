# Changelog

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
