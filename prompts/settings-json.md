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

## The `hooks` block

Always emit a `hooks` key alongside `permissions`, even when this task
generates no hook scripts itself. Three later tasks (`hooks`, `rule-git`, and
anything a project adds by hand) merge their entries into this file, and they
merge far more reliably into a scaffold that already exists than into a file
where they have to invent the shape.

Write the skeleton with empty arrays for the events the harness targets:

```json
{
  "permissions": { "...": "as selected above" },
  "hooks": {
    "PreToolUse": [],
    "PostToolUse": []
  }
}
```

If `.claude/settings.json` already has hook entries, keep every one of them
verbatim — this task never removes a hook.

Each entry a later task appends has the same shape: a `matcher` naming the
tools it fires on, and a `command` pointing through `"$CLAUDE_PROJECT_DIR"`
(quoted, because project paths contain spaces) at a script in
`.claude/hooks/`. `PreToolUse` scripts may block by exiting 2; `PostToolUse`
linters always exit 0 and warn through stdout.

## Rules

- Always include `"Read(**)"` — Claude needs to read everything.
- Always emit the `hooks` skeleton, even if empty — later tasks merge into it.
- Always deny `"Bash(rm -rf *)"` and `"Bash(sudo *)"`.
- Always include git, ls, find, cat, grep in allow.
- Create the `.claude/` directory if it doesn't exist.
