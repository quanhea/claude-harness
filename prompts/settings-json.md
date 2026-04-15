---
description: Generate .claude/settings.json with tool permissions
outputs: [".claude/settings.json"]
---

# Task: Generate .claude/settings.json

**Output:** `{{PROJECT_DIR}}/.claude/settings.json`

You are generating the Claude Code settings file that controls tool permissions for this project.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Read existing .claude/settings.json if present (merge)"
3. "Select the correct permission set for the detected language"
4. "Write .claude/settings.json following the exact schema below"
5. "Verify JSON is valid and all required fields are present"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Context

Detect project info by reading the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent). Key field: `language`.

If `.claude/settings.json` already exists, read it. Merge by ADDING missing permissions — do not remove existing ones.

## Template

Write a valid JSON file. Choose the permission block based on `language` from the project manifest.

**For TypeScript/JavaScript projects:**
```json
{
  "permissions": {
    "allow": [
      "Read(**)",
      "Write(src/**)",
      "Write(test/**)",
      "Write(tests/**)",
      "Write(docs/**)",
      "Write(.claude/**)",
      "Edit(src/**)",
      "Edit(test/**)",
      "Edit(tests/**)",
      "Edit(docs/**)",
      "Edit(.claude/**)",
      "Edit(package.json)",
      "Edit(tsconfig.json)",
      "Edit(*.config.ts)",
      "Edit(*.config.js)",
      "Bash(npm run *)",
      "Bash(npx *)",
      "Bash(node *)",
      "Bash(git *)",
      "Bash(ls *)", "Bash(find *)", "Bash(cat *)", "Bash(grep *)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(sudo *)",
      "Bash(curl * | bash)",
      "Bash(wget * | sh)"
    ]
  }
}
```

**For Python projects:**
```json
{
  "permissions": {
    "allow": [
      "Read(**)",
      "Write(src/**)", "Write(tests/**)", "Write(docs/**)", "Write(.claude/**)",
      "Edit(src/**)", "Edit(tests/**)", "Edit(docs/**)", "Edit(.claude/**)",
      "Edit(pyproject.toml)", "Edit(requirements*.txt)", "Edit(setup.py)",
      "Bash(python *)", "Bash(pytest *)", "Bash(pip *)", "Bash(uv *)",
      "Bash(ruff *)", "Bash(black *)", "Bash(mypy *)",
      "Bash(git *)",
      "Bash(ls *)", "Bash(find *)", "Bash(cat *)", "Bash(grep *)"
    ],
    "deny": ["Bash(rm -rf *)", "Bash(sudo *)"]
  }
}
```

**For Go projects:**
```json
{
  "permissions": {
    "allow": [
      "Read(**)",
      "Write(*.go)", "Write(docs/**)", "Write(.claude/**)",
      "Edit(*.go)", "Edit(go.mod)", "Edit(go.sum)", "Edit(docs/**)", "Edit(.claude/**)",
      "Bash(go *)", "Bash(golangci-lint *)",
      "Bash(git *)",
      "Bash(ls *)", "Bash(find *)", "Bash(cat *)", "Bash(grep *)"
    ],
    "deny": ["Bash(rm -rf *)", "Bash(sudo *)"]
  }
}
```

**For Rust projects:**
```json
{
  "permissions": {
    "allow": [
      "Read(**)",
      "Write(src/**)", "Write(docs/**)", "Write(.claude/**)",
      "Edit(src/**)", "Edit(Cargo.toml)", "Edit(docs/**)", "Edit(.claude/**)",
      "Bash(cargo *)", "Bash(rustfmt *)", "Bash(clippy *)",
      "Bash(git *)",
      "Bash(ls *)", "Bash(find *)", "Bash(cat *)", "Bash(grep *)"
    ],
    "deny": ["Bash(rm -rf *)", "Bash(sudo *)"]
  }
}
```

**For all other languages:** use the TypeScript block as a base but adapt the Write/Edit paths and Bash commands to match the detected language toolchain.

## Rules

- Always include `"Read(**)"` — Claude needs to read everything.
- Always deny `"Bash(rm -rf *)"` and `"Bash(sudo *)"`.
- Always include git, ls, find, cat, grep in allow.
- Create the `.claude/` directory if it doesn't exist.
