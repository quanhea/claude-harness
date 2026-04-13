# Task: Generate worktree isolation configuration

**Output:** `{{PROJECT_DIR}}/WORKTREE.md` + `{{PROJECT_DIR}}/.worktreeinclude`

**Skip if not an app.** If `package.json` has no `scripts.start`/`scripts.dev` and there is no `main.py`/`manage.py`/`main.go`/`Dockerfile`, exit without writing anything.

You are generating worktree isolation configuration — only for applications (not libraries). This enables parallel Claude agent worktrees to each get their own ports, database, docker stack, and .env.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Detect database usage (postgresql, mysql, sqlite, mongodb)"
3. "Detect Docker usage (docker-compose.yml, Dockerfile)"
4. "Detect language for worktreeinclude additions"
5. "Write WORKTREE.md with project name substituted"
6. "Write .worktreeinclude with language-specific entries"
7. "Merge worktree symlinkDirectories into .claude/settings.json"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## WORKTREE.md Template

```markdown
# Worktree Isolation

> How parallel agent worktrees are isolated in {{projectName}}.
> Each worktree gets its own ports, database, docker stack, and .env.

## How It Works

When Claude Code creates a worktree (for parallel agent work), the harness
sets up application-level isolation automatically:

1. **Unique port range** — each worktree gets 10 ports (BASE through BASE+9)
2. **Isolated .env** — copied from main project with overridden PORT, DATABASE_URL
3. **Separate database** — named `{{projectName}}_wt_<slug>` (contains `_wt_` safety marker)
4. **Docker project namespace** — `harness-<slug>` (completely separate containers)
5. **Auto-teardown** — database, containers, and registry cleaned when worktree is removed

## Port Allocation

| Offset | Service | Example (base=14523) |
|--------|---------|---------------------|
| +0 | Application | 14523 |
| +1 | Database proxy | 14524 |
| +2 | Vector (logs) | 14525 |
| +3 | Victoria Logs | 14526 |
| +4 | Victoria Metrics | 14527 |
| +5-9 | Reserved | 14528-14532 |

Ports are deterministic (hash of project path + worktree name).
Registry at `~/.claude/worktree-ports.json`.

## Database Naming

All worktree databases contain `_wt_` as a safety marker:
- Main: `{{projectName}}`
- Worktree: `{{projectName}}_wt_feature-branch`

The teardown script **refuses to drop any database without `_wt_`** in the name.

## Troubleshooting

### Port conflict
Check registry: `cat ~/.claude/worktree-ports.json | python3 -m json.tool`
Remove stale entry: edit the JSON and remove the conflicting slug.

### Orphaned database
List worktree databases: `psql -l | grep _wt_`
Drop manually: `dropdb {{projectName}}_wt_<slug>`

### Orphaned docker containers
List: `docker ps --filter "name=harness-" --format "{{.Names}}"`
Stop: `docker compose -p harness-<slug> down -v`
```

## .worktreeinclude

Start with the base file (always copy .env variants):

```
# Files to copy into each worktree (uses .gitignore syntax)
# These are gitignored files that each worktree needs its own copy of.
.env
.env.local
.env.development
.env.test
```

Then append language-specific additions:

**Node.js:** `prisma/migrations/migration_lock.toml`
**Python/Django:** `*.sqlite3`, `local_settings.py`
**Go:** `config/local.yaml`
**SQLite (any language):** `*.sqlite3`, `*.db`

## settings.json worktree section

Merge into `.claude/settings.json`:

**Node.js:** `"symlinkDirectories": ["node_modules", ".next", ".turbo"]`
**Python:** `"symlinkDirectories": [".venv", "__pycache__"]`
**Rust:** `"symlinkDirectories": ["target"]`
**Go:** `"worktree": {}` (no symlinks needed)
**Java:** `"symlinkDirectories": [".m2", ".gradle"]`

## Rules

- Only generate for isApp: true from the project manifest — skip for libraries.
- Replace `{{projectName}}` with the actual project name from the project manifest.
- Pick the correct .worktreeinclude additions for the detected language and database.
- Merge the worktree section into existing .claude/settings.json — do not overwrite other settings.
