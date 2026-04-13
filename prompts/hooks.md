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
Generate if: project has a consistent max file size (from lint config or observed pattern).
Check: `wc -l` against discovered threshold.
Remediation: "File is X lines (project convention is max Y lines). Consider splitting."

### Naming convention linter (`lint-naming.sh`)
Generate if: project has a consistent file naming pattern (all kebab-case, all PascalCase, etc.).
Check: new file name matches discovered pattern.
Remediation: "File uses X naming. This project uses Y (based on existing files like Z)."

### Structured logging linter (`lint-logging.sh`)
Generate if: project uses a structured logger AND has consistent anti-raw-logging convention.
Check: grep for raw console.log/print that bypass the project's logger.
Remediation: "Use the project's logger ({{logger-name}}) instead of raw {{print/console}}."

### Boundary validation linter (`lint-boundaries.sh`)
Generate if: project validates external data at boundaries with a specific library.
Check: grep for unvalidated external data parsing.
Remediation: "Validate with {{validation-library}} at entry boundaries."

### Architecture dependency linter (`lint-architecture.sh`)
Generate if: project has clear layer structure in ARCHITECTURE.md.
Check: read ARCHITECTURE.md for layer definitions, grep imports against allowed direction.
Remediation: "This file ({{layer}}) imports from {{higher-layer}}. See ARCHITECTURE.md invariants."

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

## Rules

- ONLY generate linters for conventions that ACTUALLY EXIST in the project.
- Every linter's check logic comes from Explore agent discovery, never from this template.
- Remediation messages must reference the project's actual tools and file paths.
- All scripts must exit 0 — these are warnings injected into context, not blockers.
- Make scripts executable: `chmod +x .claude/hooks/*.sh`
