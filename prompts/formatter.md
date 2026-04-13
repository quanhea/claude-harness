# Task: Generate formatter configuration

**Output:** `{{PROJECT_DIR}}/.prettierrc` / `ruff.toml` / `rustfmt.toml` / etc.

You are generating or documenting the formatter configuration for this project. For existing projects, document what's already there. For projects without a formatter, generate one using researched best practices.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Launch Explore agent to discover existing formatter and linter config"
3. "Decide: document existing OR generate new (never overwrite existing)"
4. "Generate formatter config if none exists (research best practices for the language)"
5. "Generate .editorconfig if none exists"
6. "Verify formatter config matches the project's actual code style"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Explore Agent Prompt (Task 2)

```
Agent(subagent_type: "Explore", prompt: "Find the formatting/linting setup in this project:
1. Is there a formatter config? (.prettierrc, .prettierrc.js, prettier.config.js,
   ruff.toml, pyproject.toml [tool.ruff], rustfmt.toml, .editorconfig,
   .rubocop.yml, .clang-format, gofmt, etc.)
2. Is there a linter config? (.eslintrc, eslint.config.js, ruff, pylint, golangci-lint, clippy)
3. What format/lint commands exist in package.json scripts or Makefile?
4. Is there a pre-commit hook for formatting?
5. What's the indentation style? (tabs vs spaces, how many? — check 5+ actual files)
6. What's the line length limit? (check for long lines in actual source files)
Report all config file paths and their exact contents.")
```

## Decision Logic

**If formatter config EXISTS**: Do NOT create a new one. Document the existing format command in output. Task complete.

**If NO formatter config exists**: Generate one based on language:

### TypeScript / JavaScript
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```
File: `.prettierrc`

### Python (ruff)
```toml
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I"]
```
File: `ruff.toml`

### Go
Go uses `gofmt` — no config file needed. Document the command:
`gofmt -w .`

### Rust
```toml
edition = "2021"
max_width = 100
```
File: `rustfmt.toml`

## .editorconfig

If `.editorconfig` doesn't exist, generate one:

```ini
root = true

[*]
indent_style = {{tabs or spaces — from discovery}}
indent_size = {{2 or 4 — from discovery}}
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

## Rules

- NEVER overwrite an existing formatter config — check first, then decide.
- The generated config must match the actual indentation and style observed in the codebase.
- If uncertain about style, default to the language ecosystem's de-facto standard.
- Document the format command in CLAUDE.md Commands section after generating.
