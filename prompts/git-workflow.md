# Task: Generate docs/GIT_WORKFLOW.md

**Output:** `{{PROJECT_DIR}}/docs/GIT_WORKFLOW.md`

**Skip if greenfield.** If `git log --oneline | wc -l` returns fewer than 10, or no `.git` directory exists, write a stub `# Git Workflow (to be defined once history accumulates)` and exit.

You are documenting the actual git workflow used in this project — discovered from real history, not invented.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Analyze git log for branching patterns (git log --oneline -50)"
3. "Check for branch naming patterns in remotes"
4. "Detect commit message conventions (conventional commits, etc.)"
5. "Check for PR/MR templates in .github/ or .gitlab/"
6. "Check for CI triggers in workflow files"
7. "Write docs/GIT_WORKFLOW.md following the exact template"
8. "Verify all sections are filled with real data (not placeholder text)"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Context

Run these discovery commands:
```bash
git log --oneline -30
git branch -a
ls .github/PULL_REQUEST_TEMPLATE* 2>/dev/null || true
cat .github/PULL_REQUEST_TEMPLATE.md 2>/dev/null || true
```

## Template

```markdown
# Git Workflow

## Branch Strategy

**Main branch:** `{{main or master}}`
**Branch naming:** `{{pattern detected from history, e.g. "feature/ticket-description" or "initials/feature-name"}}`

Protected branches: `{{list}}`

## Commit Conventions

{{Describe the commit format used. Examples:
- Conventional Commits: `feat(scope): description`
- Simple imperative: `Fix auth token expiry`
- Ticket prefix: `PROJ-123: description`}}

**Format:** `{{exact format}}`

**Rules:**
- {{Rule 1}}
- {{Rule 2}}

## Pull Request Process

1. {{Step 1 — e.g. "Create branch from main"}}
2. {{Step 2 — e.g. "Open draft PR early"}}
3. {{Step 3 — e.g. "Request review from at least 1 team member"}}
4. {{Step 4 — e.g. "Squash merge into main"}}

## CI Requirements

PRs must pass:
- {{CI check 1}}
- {{CI check 2}}

## Release Process

{{How releases are created — tags, changelog, etc. If unknown, write "Not yet defined."}}
```

## Rules

- Use REAL data from git history. Do not invent conventions.
- If you cannot determine a convention from history, write "Not yet established."
- Do NOT copy generic git workflow advice. Only document what this project actually does.
