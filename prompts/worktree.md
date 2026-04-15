---
description: Generate worktree isolation — post-checkout hook, docs/WORKTREE.md (most important feature)
outputs: ["docs/WORKTREE.md",".claude/hooks/post-checkout.sh",".claude/hooks/worktree-cleanup.sh"]
max-turns: 200
---

# Task: Generate worktree isolation (the most important feature)

**Output:**
- `{{PROJECT_DIR}}/docs/WORKTREE.md` (the living doc for this project)
- `{{PROJECT_DIR}}/.claude/hooks/post-checkout.sh` (the provisioning hook)
- `{{PROJECT_DIR}}/.claude/hooks/worktree-cleanup.sh` (the teardown helper)
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
3. "Write .claude/hooks/post-checkout.sh — project-specific provisioning script (bash)"
4. "Write .claude/hooks/worktree-cleanup.sh — teardown for removed worktrees (bash)"
5. "Install .git/hooks/post-checkout shell wrapper (idempotent — merge if present)"
6. "Wire a `wt:cleanup` convenience command into package.json (or Makefile / justfile / pyproject scripts)"
7. "Write docs/WORKTREE.md listing the detected services and the lifecycle; verify all generated files"

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

## Step 2 — Generate `.claude/hooks/post-checkout.sh`

Write a self-contained bash script (`#!/usr/bin/env bash`). Bash is always available in
git hook contexts — no PATH resolution or runtime dependency issues.
Use CLI tools the project already has: `psql`, `mysql`, `redis-cli`, `curl` (for RabbitMQ).

It must:

1. Read positional args: `prev=$1`, `new_ref=$2`, `flag=$3`. Exit 0 if `flag != 1` (file checkout, not branch/worktree).
2. Resolve the current branch: `git rev-parse --abbrev-ref HEAD`.
3. Skip provisioning for the shared-branch allowlist — by default `main`, `master`, `trunk`, `develop`. Allow override via env var `WORKTREE_SKIP_BRANCHES` (comma-separated).
4. Compute `slug = sanitize(branch)_sha6(branch)`:
   - Sanitize: lowercase, replace `[^a-z0-9]` with `_`, collapse repeated `_`, trim to 30 chars.
   - Append `_` + first 6 hex of `sha256(branch)` so two branches with the same sanitized form still get distinct resources.
5. Project name: read from `package.json`, `Cargo.toml`, `pyproject.toml`, or fall back to the repo directory name. Sanitize same way.
6. Resource name: `${project}_wt_${slug}`. The `_wt_` literal is a **safety marker** — the cleanup script refuses to touch anything without it.
7. For each detected service, provision idempotently:

   | Service | Action |
   |---------|--------|
   | PostgreSQL | `psql "$WORKTREE_ADMIN_DATABASE_URL" -c "CREATE DATABASE \"$name\""`. Default URL: `postgresql://postgres:postgres@localhost/postgres`. Ignore `already exists`. |
   | MySQL / MariaDB | `mysql -e "CREATE DATABASE IF NOT EXISTS \`$name\`"`. |
   | MongoDB | No create needed — namespace is implicit. Just compute the URL. |
   | Redis | Always use key-prefix mode: set `REDIS_PREFIX="${project}:wt:${slug}:"` in `.env.local`. No DB numbers, no registry file. |
   | RabbitMQ | `curl -su "$user:$pass" -X PUT "$WORKTREE_ADMIN_RABBITMQ_URL/api/vhosts/$name"`. Default: `http://guest:guest@localhost:15672`. Ignore 204/"already exists". |
   | Kafka / NATS | Topic prefix `${project}.wt.${slug}.` — document in `.env.local`, no API call. |
   | Elasticsearch / OpenSearch | Index prefix `${project}_wt_${slug}_` — document in `.env.local`, no API call. |
   | MinIO / LocalStack | Bucket prefix `${project}-wt-${slug}-` — document in `.env.local`, no API call. |

8. Write `.env.local` in the worktree. Copy `.env` (fallback: `.env.example`) then rewrite each detected env var to the isolated URL. Skip silently if `.env.local` already contains `_wt_${slug}` (idempotent re-run).
9. Print a summary line: `✓ worktree ${slug}: db=... redis-prefix=... rabbit=...`. Exit non-zero on any provisioning failure — `wt:cleanup` handles partial state.

Optional: detect a migration tool and run it against the new DB. `prisma/schema.prisma` → `npx prisma migrate deploy`; `alembic.ini` → `alembic upgrade head`; `config/database.yml` → `bundle exec rails db:migrate`. Run with `DATABASE_URL="$isolated_url"` in env only. Log `migrations: skipped` if no tool detected.

## Step 3 — Generate `.claude/hooks/worktree-cleanup.sh`

Manually invoked bash script. Never called from the checkout hook — cleanup on checkout would drop a live worktree's DB during rollback.

Logic:
1. `git worktree list --porcelain` → derive the live-slug set (same slug function as provisioning).
2. For each service, enumerate provisioned resources matching `${project}_wt_%`.
3. For each resource: **assert** the name contains `_wt_` — refuse and skip if not. Drop if slug not live, keep if live.
4. Print: `dropped N stale; kept M live`.

Support `--dry-run` to show what would be dropped without acting.

## Step 4 — Install `.git/hooks/post-checkout`

Write this file with `0o755`:

```sh
#!/bin/sh
# claude-harness:worktree-isolation  (do not remove this line)
repo_root="$(git rev-parse --show-toplevel)"
script="$repo_root/.claude/hooks/post-checkout.sh"
[ -f "$script" ] && exec bash "$script" "$@"
```

**Idempotent merge:** if `.git/hooks/post-checkout` already exists and
does NOT contain the sentinel `claude-harness:worktree-isolation`, append a call to our script to the END of the existing hook (not overwrite). If it already contains the sentinel, leave it alone.

The `.git/hooks/post-checkout` install covers every worktree created via `git worktree add`.

## Step 5 — Wire a cleanup command

- If `package.json` exists and has a `scripts` block: add `"wt:cleanup": "bash .claude/hooks/worktree-cleanup.sh"` (skip if already present).
- If `Makefile` exists: append a `wt-cleanup:` target.
- If `justfile` exists: append `wt-cleanup:` recipe.
- If `pyproject.toml` has `[tool.poetry.scripts]` or similar, note the manual invocation in WORKTREE.md — don't modify pyproject automatically.

Goal: `npm run wt:cleanup` (or `make wt-cleanup`) just works.

## Step 6 — Write `docs/WORKTREE.md`

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
git worktree add ../myapp-wt-foo -b wt/foo
```

On checkout, `.git/hooks/post-checkout` fires, invokes
`.claude/hooks/post-checkout.sh`, and:
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

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `permission denied to create database` | Set `WORKTREE_ADMIN_DATABASE_URL` to a role with `CREATEDB`. |
| `.env.local` missing after `git worktree add` with sparse-checkout | Git uses `--no-checkout` for sparse repos and suppresses hooks. Run manually: `bash .claude/hooks/post-checkout.sh 0 HEAD 1`. |
| Resources left behind after a crash | `npm run wt:cleanup` — reconciles against `git worktree list`. |

## Why worktrees are mandatory

See also: `.claude/rules/git-workflow.md` (loaded every session) and the
top-of-CLAUDE.md statement. This is the most important rule in the repo.
```

## Step 7 — Verify

Run `bash -n` on all generated `.sh` files to syntax-check them. Confirm every file listed
in the outputs exists and is executable. Print a summary of what was created.

## Rules

- Do NOT skip this task for libraries — libraries with integration tests that hit local services need isolation too. (The previous version of this prompt had a "skip if not an app" gate; it's gone.)
- Detect only what the codebase actually uses. If no local service is found, still generate `docs/WORKTREE.md` and the hook skeleton, but note in WORKTREE.md: "No local services detected — the hook is a no-op placeholder. If you add Postgres/Redis/etc. later, re-run `claude-harness --only worktree`."
- NEVER hardcode credentials in the generated scripts. Always read admin URLs from env vars with sensible localhost defaults.
- The `_wt_` marker is non-negotiable. Every DROP path asserts it.
- The `.git/hooks/post-checkout` install MUST be idempotent and merge-safe (see Step 4).
- If `docs/WORKTREE.md` already exists, read it first. Preserve any user customizations outside the auto-generated sections (mark the auto section with `<!-- claude-harness:worktree -->` sentinels).
