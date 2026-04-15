---
description: Generate .claude/hooks/ custom linters
---

# Task: Generate .claude/hooks/ linter scripts

**Output:** `{{PROJECT_DIR}}/.claude/hooks/*.sh`

You are generating PostToolUse hook scripts — custom linters that run after every file edit and inject remediation instructions into Claude's context. Generate ONLY linters for conventions that ACTUALLY EXIST in this project.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Launch Explore agent to discover all linting, formatting, naming conventions, and code quality rules"
3. "Read ARCHITECTURE.md to understand layer structure for dependency linter"
4. "Determine which linter scripts to generate based on discovered conventions"
5. "Write each linter shell script to .claude/hooks/"
6. "Update .claude/settings.json PostToolUse hooks to wire each script"
7. "Verify linter scripts exit 0 always (warnings only, not blockers)"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Explore Agent Prompt (Task 2)

```
Agent(subagent_type: "Explore", prompt: "Find ALL linting, formatting, and code quality tools in this project:
1. Existing linter configs (.eslintrc, ruff.toml, golangci-lint.yml, clippy, pylint, etc.)
2. Existing formatter configs (.prettierrc, rustfmt.toml, .editorconfig, etc.)
3. Pre-commit hooks (.husky/, .pre-commit-config.yaml, .git/hooks/)
4. CI lint steps (in GitHub Actions or other CI)
5. package.json lint/format scripts
6. The naming convention ACTUALLY used (scan file names, class names, function names)
7. The logging approach ACTUALLY used (grep for logger/console/print usage)
8. The validation approach ACTUALLY used (grep for schema validation at boundaries)
9. The average and max file sizes across source files
10. Any existing custom lint rules or project-specific checks
Report everything with specific file paths and patterns found.")
```

## Which Linters to Generate

**Generate ONLY if the pattern is FOUND in the project:**

### File size linter (`lint-filesize.sh`)
Generate if: project has a consistent max file size (from lint config or observed pattern). Check: `wc -l` against discovered threshold. Remediation: "File is X lines (project convention is max Y lines). Consider splitting."

### Naming convention linter (`lint-naming.sh`)
Generate if: project has a consistent file naming pattern (all kebab-case, all PascalCase, etc.). Check: new file name matches discovered pattern. Remediation: "File uses X naming. This project uses Y (based on existing files like Z)."

### Structured logging linter (`lint-logging.sh`)
Generate if: project uses a structured logger AND has consistent anti-raw-logging convention. Check: grep for raw console.log/print that bypass the project's logger. Remediation: "Use the project's logger ({{logger-name}}) instead of raw {{print/console}}."

### Boundary validation linter (`lint-boundaries.sh`)
Generate if: project validates external data at boundaries with a specific library. Check: grep for unvalidated external data parsing. Remediation: "Validate with {{validation-library}} at entry boundaries."

### Architecture dependency linter (`lint-architecture.sh`)
Generate if: project has clear layer structure in ARCHITECTURE.md. Check: read ARCHITECTURE.md for layer definitions, grep imports against allowed direction. Remediation: "This file ({{layer}}) imports from {{higher-layer}}. See ARCHITECTURE.md invariants."

## Hook Script Format

```bash
#!/usr/bin/env bash
# {{description of what this checks}}
# PostToolUse hook — receives JSON on stdin, exits 0 always

set -euo pipefail

# Read the file path from PostToolUse JSON input
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")

[ -z "$FILE_PATH" ] && exit 0
[ ! -f "$FILE_PATH" ] && exit 0

# {{check logic}}

exit 0  # Always exit 0 — warnings only, not blockers
```

## settings.json Wiring

Add PostToolUse hooks to `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/lint-{{name}}.sh",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

Merge with existing hooks — do not overwrite.

## Workflow Enforcement Hooks (Always Generate — Non-Optional)

These are NOT advisory linters. They block tool calls with exit code 2. Generate them
unconditionally — regardless of what project conventions were or were not found.

### Worktree enforcement (`enforce-worktree.sh`)

This hook blocks Edit and Write calls when Claude is running in the main git working tree
instead of a linked worktree. It implements CLAUDE.md Rule 1 mechanically, because text
rules alone are not reliably followed.

**Detection:** In a linked worktree, `$GIT_TOPLEVEL/.git` is a *file* (gitdir pointer).
In the main working tree, it is a *directory*. One `[ -d ]` check is sufficient.

**Bypass:** `CLAUDE_HARNESS_SETUP=1` in the environment skips enforcement — the harness
sets this when running setup agents so they can write files freely during initial project
scaffolding.

```bash
#!/usr/bin/env bash
# PreToolUse enforcement: require a git worktree for all code edits.
# Exit 0 = allow. Exit 2 = block (stderr becomes Claude's feedback).

set -euo pipefail

# Allow harness setup runs to bypass enforcement.
[ "${CLAUDE_HARNESS_SETUP:-}" = "1" ] && exit 0

# Parse cwd from the PreToolUse JSON on stdin.
INPUT=$(cat)
CWD=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null || echo "")
[ -z "$CWD" ] && CWD=$(pwd)

# Find the git toplevel. Not a git repo → no enforcement.
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

Make it executable:
```bash
chmod +x "{{PROJECT_DIR}}/.claude/hooks/enforce-worktree.sh"
```

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

## Rules

- ONLY generate advisory linters for conventions that ACTUALLY EXIST in the project.
- Every advisory linter's check logic comes from Explore agent discovery, never from this template.
- Remediation messages must reference the project's actual tools and file paths.
- All advisory linter scripts must exit 0 — warnings injected into context, not blockers.
- `enforce-worktree.sh` is mandatory and must always be generated and wired. It exits 2.
- Make all scripts executable: `chmod +x .claude/hooks/*.sh`
