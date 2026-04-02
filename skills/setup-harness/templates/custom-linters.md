# Template: Project-Specific Custom Linters

> Article: "we statically enforce structured logging, naming conventions for schemas
> and types, file size limits, and platform-specific reliability requirements with
> custom lints. Because the lints are custom, we write the error messages to inject
> remediation instructions into agent context."
>
> Linters MUST be generated per-project based on discovered conventions.
> NEVER use hardcoded rules — every check comes from what the Explore agent found.

---

## How to Generate

### Step 1: Discover what to lint

**Launch an Explore agent** to find the project's existing lint/format setup and conventions:

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
9. The average and max file sizes
10. Any existing custom lint rules or project-specific checks
Report everything with specific file paths and patterns found.")
```

### Step 2: Generate linter scripts

Based on the Explore agent findings, generate shell scripts at `.claude/hooks/` in the user's project. Each script:
- Checks ONE thing (single responsibility)
- Receives hook input JSON on stdin (PostToolUse provides tool_input with file_path)
- Writes remediation to stderr (injected into agent context)
- Exits 0 always (warnings, not blockers)

**Only generate linters for rules the project ACTUALLY has.** If the project has no naming convention, don't generate a naming linter. If the project uses console.log legitimately, don't generate a structured logging linter.

### Step 3: Wire into .claude/settings.json

Add PostToolUse hooks to the project's `.claude/settings.json`:

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

---

## What Linters to Consider (generate ONLY if discovered)

### File size linter
**Generate if**: The project has a convention about file size (discovered from existing lint config, or the Explore agent finds files are consistently under a threshold).
**Script**: Check `wc -l` against the discovered threshold.
**Remediation**: "File is X lines (project convention is max Y). Split this file."

### Naming convention linter
**Generate if**: The project has a consistent naming convention (discovered by scanning existing files).
**Script**: Check new file names match the discovered pattern.
**Remediation**: "File uses X naming. This project uses Y naming (based on existing files like Z)."

### Structured logging linter
**Generate if**: The project uses a structured logger AND has a convention against raw print/console.log (discovered from existing lint rules or logger usage patterns).
**Script**: Check for raw logging calls that bypass the structured logger.
**Remediation**: "Use the project's logger (discovered: {{logger-name}}) instead of {{raw-call}}."

### Boundary validation linter
**Generate if**: The project uses schema validation at boundaries (discovered from existing validation patterns — whatever library they use).
**Script**: Check for unvalidated external data parsing.
**Remediation**: "Validate with {{project's-validation-library}} at boundaries."

### Architecture dependency linter
**Generate if**: The project has a clear layer structure documented in ARCHITECTURE.md.
**Script**: Read ARCHITECTURE.md for layer definitions, check imports against allowed direction.
**Remediation**: "This file ({{layer}}) imports from {{higher-layer}}. See docs/ARCHITECTURE.md."

### Custom project-specific linters
**Generate if**: The Explore agent finds project-specific rules (from existing lint config, pre-commit hooks, or CI checks) that aren't covered above.
**Script**: Whatever check enforces the discovered rule.
**Remediation**: Project-specific message.

---

## Adaptation Instructions

1. ONLY generate linters for conventions that ACTUALLY EXIST in the project
2. Every linter's rules come from Explore agent discovery, never from this template
3. The remediation messages must reference the project's actual tools and conventions
4. Linter scripts live in the user's repo (`.claude/hooks/`), not in the plugin
5. Hook wiring goes into the user's `.claude/settings.json`, not the plugin's hooks.json
6. For greenfield projects: research linting best practices for the language/framework, propose linters, let user decide which to keep
