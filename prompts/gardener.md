---
description: Register project with the doc-gardening scheduler
---

# Task: Register project with gardener + create cron schedule

**Output:** Entry in `~/.claude-harness/projects.json` + CronCreate schedule

You are registering this project with the claude-harness gardener so that the project's docs are kept fresh automatically. The gardener follows the "doc-gardening" pattern from the harness-engineering article: it periodically scans every tracked `.md` file for references that no longer match the live code (moved files, renamed types, removed commands, etc.) and commits fix-ups. It does not maintain a separate encyclopedia — it updates `CLAUDE.md`, `ARCHITECTURE.md`, and the files in `docs/` in place.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Check if project is already registered (read ~/.claude-harness/projects.json)"
3. "Determine gardener schedule from project type"
4. "Register project with gardener API"
5. "Create CronCreate schedule for this project"
6. "Verify registration: list projects and confirm this project appears"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Registration Logic

### Check existing registration

Read `~/.claude-harness/projects.json`. If the project path (`{{PROJECT_DIR}}`) already exists, skip registration and move to schedule verification.

### Determine schedule

Use these defaults based on project activity:
- Active development projects: `0 9 * * 1-5` (weekdays at 9am)
- Stable/maintenance projects: `0 9 * * 1` (Mondays at 9am)

Default to weekday schedule. The user can change it via `claude-harness gardener add --schedule`.

### Register via CLI

Run:
```bash
claude-harness gardener add {{PROJECT_DIR}} --schedule "0 9 * * 1-5"
```

If `claude-harness` CLI is not available, write directly to `~/.claude-harness/projects.json`:

```json
{
  "projects": [
    {
      "path": "{{PROJECT_DIR}}",
      "schedule": "0 9 * * 1-5",
      "lastRunAt": null,
      "lastWorktreeCommit": null
    }
  ]
}
```

Use atomic write: write to `.tmp` file, then rename.

## First Run

The gardener's first scheduled trigger does a full freshness audit of every tracked doc (CLAUDE.md, ARCHITECTURE.md, docs/**/*.md). Subsequent runs are incremental — they only re-check docs that reference files changed since the previous run.

To trigger immediately:
```bash
claude-harness gardener run {{PROJECT_DIR}}
```

## CronCreate

After registration, create a CronCreate entry to run the gardener on schedule:

```
CronCreate({
  schedule: "0 9 * * 1-5",
  prompt: "Run the claude-harness gardener for project at {{PROJECT_DIR}}. Execute: claude-harness gardener run {{PROJECT_DIR}}",
  description: "claude-harness gardener — {{projectName}}"
})
```

## Rules

- Never overwrite an existing registration — only add if not present.
- If gardener CLI is unavailable, write to `~/.claude-harness/projects.json` directly.
- The CronCreate schedule must match the registered schedule.
- Report the gardener schedule and next run time in the output.
