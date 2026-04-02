# Template: Formatting Rules

> Article: "initial scaffold—repository structure, CI configuration, formatting rules"
> Formatting rules are part of the initial scaffold. Generate the right config for the detected language.

---

## Variant: Node.js / TypeScript

### File: .prettierrc

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

### File: .editorconfig

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

**Command**: `npx prettier --write .` or `npm run format`

---

## Variant: Python

### File: pyproject.toml (append [tool.ruff] section if pyproject.toml exists, else create ruff.toml)

```toml
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP"]

[tool.ruff.format]
quote-style = "double"
```

**Command**: `ruff check --fix . && ruff format .`

---

## Variant: Go

No config file needed — `gofmt` is built-in and has no options.

**Command**: `gofmt -w .` or `goimports -w .`

---

## Variant: Rust

### File: rustfmt.toml

```toml
max_width = 100
tab_spaces = 4
edition = "2021"
```

**Command**: `cargo fmt`

---

## Variant: Java

### File: .editorconfig

```ini
root = true

[*]
indent_style = space
indent_size = 4
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

**Command**: project-dependent (Checkstyle, Spotless, google-java-format)

---

## Variant: Ruby

### File: .rubocop.yml

```yaml
AllCops:
  NewCops: enable
  TargetRubyVersion: 3.2

Layout/LineLength:
  Max: 100
```

**Command**: `rubocop -a`

---

## Adaptation Instructions

1. Only generate for the detected language — don't create configs for languages not used
2. If a formatter config ALREADY EXISTS, do NOT overwrite — the project has its own style
3. Add the format command to `.claude/CLAUDE.md` Commands section
4. If using the formatting config, add it to the lint step in `.claude/rules/architecture.md`
