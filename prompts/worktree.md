---
description: Generate worktree isolation — post-checkout hook, docs/WORKTREE.md (most important feature)
outputs: ["docs/WORKTREE.md",".claude/hooks/post-checkout.js",".claude/hooks/worktree-cleanup.js",".claude/hooks/enforce-worktree.sh"]
max-turns: 200
---

# Task: Generate worktree isolation (the most important feature)

**Output:**
- `{{PROJECT_DIR}}/docs/WORKTREE.md` (the living doc for this project)
- `{{PROJECT_DIR}}/.claude/hooks/post-checkout.js` (the provisioning hook)
- `{{PROJECT_DIR}}/.claude/hooks/worktree-cleanup.js` (the teardown helper)
- `{{PROJECT_DIR}}/.git/hooks/post-checkout` (shell wrapper that calls the node script)
- Merged entries in `{{PROJECT_DIR}}/.claude/settings.json` allow-list
- Added `wt:cleanup` script to the project manifest where possible (`package.json`, `Makefile`, `justfile`, etc.)

## Why this task exists

Parallel agent work corrupts shared local state. Two agents on two branches hitting the same local Postgres database, Redis, or RabbitMQ will overwrite each other's rows, blow up migrations, and desync queues. This task solves that by making every git worktree get its OWN isolated copy of every local service the project touches, provisioned automatically on checkout.

**Local development in this repo is worktree-only after this runs.** The companion rule (`.claude/rules/git-workflow.md`) enforces it at the agent level; this task makes the physical isolation real.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect the project's local services (database, queue, cache, broker, search, object store) by reading the codebase"
2. "Decide which env var names to rewrite per-worktree (DATABASE_URL, REDIS_URL, ...)"
3. "Write .claude/hooks/post-checkout.js — project-specific provisioning script"
4. "Write .claude/hooks/worktree-cleanup.js — teardown for removed worktrees"
5. "Install .git/hooks/post-checkout shell wrapper (idempotent — merge if present)"
6. "Wire a `wt:cleanup` convenience command into package.json (or Makefile / justfile / pyproject scripts)"
6. "Write .claude/hooks/enforce-worktree.sh and wire into .claude/settings.json PreToolUse"
7. "Write docs/WORKTREE.md listing the detected services and the lifecycle"
8. "Verify every generated file exists and is syntactically valid (node --check)"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Step 1 — Service Detection

Read the codebase and identify every local service the project talks to. Look in these places (no guessing — only include what you actually find):

**Databases**
- `.env*` files for `DATABASE_URL`, `DB_HOST`, `POSTGRES_*`, `MYSQL_*`, `MONGO_*`
- `docker-compose*.yml` / `compose*.yml` services with images matching `postgres*|mysql*|mariadb*|mongo*|cockroach*`
- ORM configs: `prisma/schema.prisma`, `alembic.ini`, `config/database.yml` (Rails), `ormconfig.*` (TypeORM), `knexfile.*`, `sequelize*.js`, `drizzle.config.*`
- Manifests: `package.json` deps (`pg`, `mysql2`, `mongodb`, `mongoose`), `requirements*.txt` / `pyproject.toml` (`psycopg*`, `pymongo`, `asyncpg`), `Gemfile.lock`, `go.mod` (`lib/pq`, `gorm.io/driver/postgres`)

**Message queues / brokers**
- Deps: `amqplib`, `kafkajs`, `bullmq`, `nats`, `@nestjs/bull`, `pika`, `aio-pika`, `confluent-kafka`, `celery` with redis/rabbit broker
- Compose images: `rabbitmq*`, `zookeeper*`, `confluentinc/cp-*`, `nats*`

**Cache**
- Deps: `redis`, `ioredis`, `redis-py`, `go-redis`, `cache-manager-redis*`
- Compose image: `redis*`

**Search**
- Deps / compose: `elasticsearch*`, `opensearch*`, `meilisearch*`, `typesense*`

**Object store (local)**
- Compose images: `minio/*`, `localstack/*`
- Env vars: `S3_ENDPOINT` pointing at `localhost`

For each hit, record:
- `service` (e.g. `postgres`, `redis`, `rabbitmq`)
- `envVars` (canonical names the project actually uses — don't invent new ones; read them from `.env.example` or the code)
- `adminHint` (where to reach the service's admin interface — `localhost:5432` defaults if you can't tell)

Write this mapping down as a comment block at the top of `post-checkout.js` so humans can audit what the detector saw.

## Step 2 — Generate `.claude/hooks/post-checkout.js`

Write a self-contained Node.js script with zero non-built-in dependencies **except** the database/queue client libraries the project already uses (re-use what's in `package.json` — don't add new deps).

It must:

1. Read argv: `prev = process.argv[2]`, `newRef = process.argv[3]`, `flag = process.argv[4]`. Exit 0 if `flag !== "1"` (file checkout, not branch/worktree).
2. Resolve the current branch: `execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"])`.
3. Skip provisioning for the shared-branch allowlist — by default `main`, `master`, `trunk`, `develop`. Allow override via env var `WORKTREE_SKIP_BRANCHES` (comma-separated).
4. Compute `slug = sanitize(branch) + "_" + sha6(branch)`:
   - Sanitize: lowercase, replace `[^a-z0-9_]` with `_`, collapse repeated `_`, trim to 30 chars.
   - Append `_` + first 6 hex of `sha256(branch)` so two branches that sanitize to the same slug still get different DBs.
5. Project name comes from `package.json` `name` / `Cargo.toml` `[package].name` / `pyproject.toml` `[project].name` / the repo directory name as fallback. Sanitize same way.
6. Resource name template: `` `${project}_wt_${slug}` `` (or `${project}.wt.${slug}` for dotted namespaces like Kafka topics). The `_wt_` literal is a **safety marker** — the cleanup script refuses to touch anything without it.
7. Acquire a file-lock at `path.join(os.homedir(), ".claude-harness", "locks", `${project}.lock`)` using `fs.openSync(path, "wx")`. If lock taken, retry up to 30 seconds with 500ms backoff, then fail.
8. For each detected service, provision idempotently:

   | Service | Action |
   |---------|--------|
   | PostgreSQL | `CREATE DATABASE "<name>"` via the admin URL (env `WORKTREE_ADMIN_DATABASE_URL`, default `postgresql://postgres:postgres@localhost/postgres`). Swallow `42P04 database already exists`. |
   | MySQL / MariaDB | `CREATE DATABASE IF NOT EXISTS \`<name>\`` via admin URL. |
   | MongoDB | No create needed — writing to the DB creates it implicitly. Just compute the URL. |
   | Redis | Assign a DB number 0–15 from a registry at `~/.claude-harness/redis-registry.json` (one map per project: slug → dbNumber). Free the number on cleanup. If >16 worktrees, fall back to key-prefix mode (document in the URL as `?prefix=<project>:wt:<slug>:`). |
   | RabbitMQ | `POST /api/vhosts/<name>` against the management API (default `http://guest:guest@localhost:15672`, env `WORKTREE_ADMIN_RABBITMQ_URL`). Ignore 204 and "already exists". Grant the default user permissions on the new vhost. |
   | Kafka / NATS | Topic/subject prefix `${project}.wt.${slug}.` — no API call; documented so the app reads a prefix env var and the URL builder adds it. |
   | Elasticsearch / OpenSearch | Index prefix `${project}_wt_${slug}_` — no API call. |
   | MinIO / LocalStack | Bucket prefix `${project}-wt-${slug}-` — no API call. |

9. Write the worktree's `.env.local` (always this filename — works for Next, Vite, Node, Rails, Django-environ, python-dotenv). Seed from `.env` (fallback: `.env.example`) then override every detected env var with the isolated-resource URL. Preserve every other line verbatim. **Skip silently if `.env.local` already exists and already contains `_wt_${slug}`** (idempotency for re-runs).
10. Release the lock, print a single summary line: `✓ worktree ${slug}: db=... redis=db3 rabbit=...`.
11. **On any error, never partial-provision:** if any service fails, DROP anything already created for this slug and exit non-zero. Let the next invocation retry cleanly.

Optional: detect a migration command and run it for the new DB. Detectors: `prisma/schema.prisma` → `npx prisma migrate deploy`; `alembic.ini` → `alembic upgrade head`; `config/database.yml` → `bundle exec rails db:migrate`; `migrations/*.sql` or `db/migrations/` → skip (too unspecific); no detector → skip, log `migrations: skipped (no tool detected)`. Run the migration with the per-worktree DATABASE_URL **in the environment only**, never persisting it.

## Step 3 — Generate `.claude/hooks/worktree-cleanup.js`

Manually invoked. Never runs from the checkout hook itself — cleanup on checkout would delete a live worktree's DB during a rollback.

Logic:
1. `git worktree list --porcelain` → set of live worktree paths and branches.
2. Derive the live-slug set (apply the same slug function used at provision time).
3. For each service, enumerate provisioned resources (e.g. `SELECT datname FROM pg_database WHERE datname LIKE '<project>_wt_%'`).
4. For each resource:
   - **Assert** the name contains `_wt_` (or `.wt.` for dotted). Refuse otherwise — print an error and skip.
   - If the slug extracted from the name is NOT in the live set, drop it.
   - If the slug IS in the live set, keep.
5. Print diff: `dropped N stale; kept M live`.

Add a `--dry-run` flag that prints what WOULD be dropped without doing it.

## Step 4 — Install `.git/hooks/post-checkout`

Write this file with `0o755`:

```sh
#!/bin/sh
# claude-harness:worktree-isolation  (do not remove this line)
repo_root="$(git rev-parse --show-toplevel)"
if [ -f "$repo_root/.claude/hooks/post-checkout.js" ]; then
  exec node "$repo_root/.claude/hooks/post-checkout.js" "$@"
fi
```

**Idempotent merge:** if `.git/hooks/post-checkout` already exists and
does NOT contain the sentinel `claude-harness:worktree-isolation`, append a call to our script to the END of the existing hook (not overwrite). If it already contains the sentinel, leave it alone.

Claude Code sets `core.hooksPath` per-worktree back to the main repo's `.git/hooks/` (see `/Users/anhqtran/code/opensource/claude-code/src/utils/worktree.ts:565`), so one install covers every worktree created by `claude -w` too.

## Step 5 — Wire a cleanup command

- If `package.json` exists and has a `scripts` block: add `"wt:cleanup": "node .claude/hooks/worktree-cleanup.js"` (skip if already present).
- If `Makefile` exists: append a `wt-cleanup:` target.
- If `justfile` exists: append `wt-cleanup:` recipe.
- If `pyproject.toml` has `[tool.poetry.scripts]` or similar, note the manual invocation in WORKTREE.md — don't modify pyproject automatically.

Goal: `npm run wt:cleanup` (or `make wt-cleanup`) just works.

## Step 6 — Generate `.claude/hooks/enforce-worktree.sh`

This hook blocks Edit and Write tool calls when Claude is running in the main git working
tree instead of a linked worktree. It is the mechanical enforcement of the worktree-first
mandate — text rules alone are not reliably followed.

**Detection:** In a linked worktree, `$GIT_TOPLEVEL/.git` is a *file* (gitdir pointer).
In the main working tree, it is a *directory*. One `[ -d ]` check is sufficient.

**Bypass:** `CLAUDE_HARNESS_SETUP=1` skips enforcement so the harness can write project
files freely during initial setup.

```bash
#!/usr/bin/env bash
# PreToolUse enforcement: require a git worktree for all code edits.
# Exit 0 = allow. Exit 2 = block (stderr becomes Claude's feedback context).

set -euo pipefail

[ "${CLAUDE_HARNESS_SETUP:-}" = "1" ] && exit 0

INPUT=$(cat)
CWD=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null || echo "")
[ -z "$CWD" ] && CWD=$(pwd)

GIT_TOP=$(git -C "$CWD" rev-parse --show-toplevel 2>/dev/null || echo "")
[ -z "$GIT_TOP" ] && exit 0

# .git is a DIRECTORY in the main working tree; a FILE in a linked worktree.
if [ -d "$GIT_TOP/.git" ]; then
  BRANCH=$(git -C "$CWD" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  echo "Blocked: on branch '$BRANCH' in the main working tree — not a git worktree." >&2
  echo "This repo requires worktree-first development — no exceptions." >&2
  echo "" >&2
  echo "Open a worktree:" >&2
  echo "  claude -w                                    # preferred (Claude Code names the branch)" >&2
  echo "  git worktree add ../<name> -b <branch>       # manual" >&2
  echo "" >&2
  echo "See docs/WORKTREE.md for service provisioning and the full workflow." >&2
  exit 2
fi

exit 0
```

Make it executable: `chmod +x "{{PROJECT_DIR}}/.claude/hooks/enforce-worktree.sh"`

Wire into `.claude/settings.json` as a PreToolUse hook — MERGE with existing hooks, do not overwrite:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/enforce-worktree.sh",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

## Step 7 — Write `docs/WORKTREE.md`

Template (fill in the bracketed bits from detection):

```markdown
# Worktree Isolation

> Local development in this repo is worktree-only. Every branch you work
> on locally lives in its own `git worktree` with its own isolated
> database, queue, cache, and `.env.local`. Branches are for remote
> history; locally, worktrees always.

## Why

Parallel agents sharing local services corrupt each other's state. A
post-checkout hook in `.claude/hooks/post-checkout.js` provisions an
isolated copy of every service this project touches whenever a new
worktree is created.

## Detected services

This project uses the following local services. Each is isolated per
worktree using the pattern `{{projectName}}_wt_<slug>`:

[table here: Service | Env var | Isolated name pattern | Provisioned by hook?]

## Lifecycle

**Create a worktree:**
```bash
claude -w                       # Preferred — also names the branch for you git worktree add ../myapp-wt-foo -b wt/foo   # Equivalent
```

On checkout, `.git/hooks/post-checkout` fires, invokes
`.claude/hooks/post-checkout.js`, and:
1. Computes a slug from the branch name.
2. Skips if the branch is in the shared-branch allowlist (`main`, `master`, `trunk`, `develop`).
3. Creates the isolated resources (DB, vhost, Redis db-number, …).
4. Writes a fresh `.env.local` in the worktree with the isolated URLs.
5. Runs migrations if a tool was detected ([Prisma/Alembic/Rails/…]).

**Work in the worktree:**
```bash
cd ../myapp-wt-foo [dev command]               # Reads .env.local, talks to the isolated DB
```

**When done:**
```bash
git worktree remove ../myapp-wt-foo npm run wt:cleanup              # Drops stale DBs, vhosts, etc. (safe — asserts the _wt_ marker)
```

## Configuration

- `WORKTREE_ADMIN_DATABASE_URL` — admin connection for creating/dropping DBs. Default: `postgresql://postgres:postgres@localhost/postgres`.
- `WORKTREE_ADMIN_RABBITMQ_URL` — default `http://guest:guest@localhost:15672`.
- `WORKTREE_SKIP_BRANCHES` — comma-separated branch names that skip provisioning. Default: `main,master,trunk,develop`.

## Safety

- Every isolated resource contains `_wt_` in its name. The cleanup script
  refuses to DROP anything without that marker — there is no code path
  that can take down the shared dev DB.
- The hook uses a file-lock at `~/.claude-harness/locks/<project>.lock`
  so two simultaneous `git worktree add` calls serialize cleanly.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `permission denied to create database` | Set `WORKTREE_ADMIN_DATABASE_URL` to a role with `CREATEDB`. |
| Stuck lock file in `~/.claude-harness/locks/` | Remove it after confirming no `post-checkout.js` is running. |
| `.env.local` missing after `claude -w` with sparse-checkout | Claude Code uses `--no-checkout` for sparse repos and suppresses hooks. Run manually: `node .claude/hooks/post-checkout.js 0 HEAD 1`. |
| Resources left behind after a crash | `npm run wt:cleanup` — it reconciles against `git worktree list`. |

## Why worktrees are mandatory

See also: `.claude/rules/git-workflow.md` (loaded every session) and the
top-of-CLAUDE.md statement. This is the most important rule in the repo.
```

## Rules

- Do NOT skip this task for libraries — libraries with integration tests that hit local services need isolation too. (The previous version of this prompt had a "skip if not an app" gate; it's gone.)
- Detect only what the codebase actually uses. If no local service is found, still generate `docs/WORKTREE.md` and the hook skeleton, but note in WORKTREE.md: "No local services detected — the hook is a no-op placeholder. If you add Postgres/Redis/etc. later, re-run `claude-harness --only worktree`."
- NEVER hardcode credentials in the generated scripts. Always read admin URLs from env vars with sensible localhost defaults.
- The `_wt_` marker is non-negotiable. Every DROP path asserts it.
- The `.git/hooks/post-checkout` install MUST be idempotent and merge-safe (see Step 4).
- If `docs/WORKTREE.md` already exists, read it first. Preserve any user customizations outside the auto-generated sections (mark the auto section with `<!-- claude-harness:worktree -->` sentinels).
