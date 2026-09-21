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

### Naming convention linter (`lint-naming.sh`)
Generate if: project has a consistent file naming pattern (all kebab-case, all PascalCase, etc.). Check: new file name matches discovered pattern. Remediation: "File uses X naming. This project uses Y (based on existing files like Z)."

### Structured logging linter (`lint-logging.sh`)
Generate if: project uses a structured logger AND has consistent anti-raw-logging convention. Check: grep for raw console.log/print that bypass the project's logger. Remediation: "Use the project's logger ({{logger-name}}) instead of raw {{print/console}}."

These two are the whole catalog, and that is deliberate. A PostToolUse linter
earns its place only when the rule is mechanical enough to check from one
file's path and text, and specific enough that a violation is always wrong.
Naming and raw-logging clear that bar. File-size caps, boundary validation,
and layering rules do not: each needs project context the hook cannot see, so
they fire on legitimate code, and a linter that cries wolf gets ignored.
Enforce those in review or in the real linter, where the whole tree is in
scope.

If the Explore agent surfaces a third convention that genuinely clears the
bar, generate it — but hold it to the same test.

## Hook Script Format

```bash
#!/usr/bin/env bash
# {{description of what this checks}}
# PostToolUse hook — receives JSON on stdin, exits 0 always

set -euo pipefail

# Skip while claude-harness is scaffolding — the harness sets this on every
# subprocess it spawns so setup writes are never second-guessed by a linter.
[ "${CLAUDE_HARNESS_SETUP:-}" = "1" ] && exit 0

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
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/lint-{{name}}.sh",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

Merge with existing hooks — do not overwrite.

Always wire the command through `"$CLAUDE_PROJECT_DIR"` (quoted — project paths
contain spaces). A bare relative path like `.claude/hooks/lint-naming.sh` only
resolves when Claude's cwd happens to be the project root, which in a
worktree-first setup is the exception, not the rule.

## Rules

- ONLY generate linters for conventions that ACTUALLY EXIST in the project.
- Every script starts with the `CLAUDE_HARNESS_SETUP` guard shown above.
- Every linter's check logic comes from Explore agent discovery, never from this template.
- Remediation messages must reference the project's actual tools and file paths.
- All scripts must exit 0 — these are warnings injected into context, not blockers.
- Make scripts executable: `chmod +x .claude/hooks/*.sh`
