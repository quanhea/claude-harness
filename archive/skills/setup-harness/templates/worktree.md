# Template: Worktree Isolation Configuration

> Article: "we made the app bootable per git worktree, so Codex could launch
> and drive one instance per change. Codex works on a fully isolated version
> of that app—including its logs and metrics, which get torn down once that
> task is complete."
>
> Generate these files for APPLICATIONS only (not libraries).

---

## File: WORKTREE.md

```markdown
# Worktree Isolation

> How parallel agent worktrees are isolated in {{project-name}}.
> Each worktree gets its own ports, database, docker stack, and .env.

## How It Works

When Claude Code creates a worktree (for parallel agent work), the harness
plugin automatically sets up application-level isolation:

1. **Unique port range** — each worktree gets 10 ports (BASE through BASE+9)
2. **Isolated .env** — copied from main project with overridden PORT, DATABASE_URL
3. **Separate database** — named `{{project-name}}_wt_<slug>` (contains `_wt_` safety marker)
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
- Main: `{{project-name}}`
- Worktree: `{{project-name}}_wt_feature-branch`

The teardown script **refuses to drop any database without `_wt_`** in the name.

## Troubleshooting

### Port conflict
Check registry: `cat ~/.claude/worktree-ports.json | python3 -m json.tool`
Remove stale entry: edit the JSON and remove the conflicting slug.

### Orphaned database
List worktree databases: `psql -l | grep _wt_`
Drop manually: `dropdb {{project-name}}_wt_<slug>`

### Orphaned docker containers
List: `docker ps --filter "name=harness-" --format "{{{{.Names}}}}"`
Stop: `docker compose -p harness-<slug> down -v`
```

---

## File: .worktreeinclude

```
# Files to copy into each worktree (uses .gitignore syntax)
# These are gitignored files that each worktree needs its own copy of.
.env
.env.local
.env.development
.env.test
```

### Language-specific additions

**Node.js** — append:
```
prisma/migrations/migration_lock.toml
```

**Python/Django** — append:
```
*.sqlite3
local_settings.py
```

**Go** — append:
```
.env
config/local.yaml
```

---

## Merge into .claude/settings.json: worktree section

### Node.js

```json
{
  "worktree": {
    "symlinkDirectories": ["node_modules", ".next", ".turbo"]
  }
}
```

### Python

```json
{
  "worktree": {
    "symlinkDirectories": [".venv", "__pycache__"]
  }
}
```

### Rust

```json
{
  "worktree": {
    "symlinkDirectories": ["target"]
  }
}
```

### Go

```json
{
  "worktree": {}
}
```

### Java (Maven)

```json
{
  "worktree": {
    "symlinkDirectories": [".m2", ".gradle"]
  }
}
```

---

## Adaptation Instructions

1. Replace `{{project-name}}` with actual project name
2. Only generate for applications, not libraries
3. Pick the correct language-specific `.worktreeinclude` additions
4. Pick the correct `symlinkDirectories` for the project's language
5. Merge the `worktree` section into the existing `.claude/settings.json`
6. If the project uses Docker, the harness hooks will handle compose isolation automatically
7. If the project uses SQLite, `.worktreeinclude` ensures the DB file is copied per worktree
