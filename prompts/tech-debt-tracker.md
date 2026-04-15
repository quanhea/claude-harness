---
description: Generate docs/exec-plans/tech-debt-tracker.md
outputs: ["docs/exec-plans/tech-debt-tracker.md"]
---

# Task: Generate docs/exec-plans/tech-debt-tracker.md

**Output:** `{{PROJECT_DIR}}/docs/exec-plans/tech-debt-tracker.md`

You are creating the tech debt tracker — a living document that captures known debt items for the team to address over time.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Search codebase for TODO/FIXME/HACK/XXX comments"
3. "Check git log for recurring fix/patch/workaround commits"
4. "Check for known issues in README or CONTRIBUTING"
5. "Write docs/exec-plans/tech-debt-tracker.md following the exact template"
6. "Verify each debt item has an effort estimate and owner field"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Context

```bash
grep -r "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.py" --include="*.go" --include="*.rb" -l {{PROJECT_DIR}}/src 2>/dev/null | head -20
grep -r "TODO\|FIXME\|HACK\|XXX" {{PROJECT_DIR}}/src 2>/dev/null | head -30
```

## Template

```markdown
# Tech Debt Tracker

Updated: {{today's date}}

## Scoring

Each item is scored on:
- **Impact**: how much it slows the team or causes bugs (High/Med/Low)
- **Effort**: to fix (XS=hours, S=days, M=week, L=weeks, XL=months)

## Active Debt

### High Impact

| Item | Location | Effort | Owner | Added |
|------|----------|--------|-------|-------|
{{e.g.: | Missing input validation on /api/users | src/api/users.ts | S | — | {{date}} |}}
{{Add items found from TODO/FIXME scan}}

### Medium Impact

| Item | Location | Effort | Owner | Added |
|------|----------|--------|-------|-------|
{{items}}

### Low Impact

| Item | Location | Effort | Owner | Added |
|------|----------|--------|-------|-------|
{{items}}

## Resolved Debt

| Item | Resolved | PR |
|------|----------|----|
| (empty) | — | — |

## Patterns

{{Are there any systemic patterns in the debt? E.g. "Most debt is in the authentication module" or "Many missing error handlers"}}
```

## Rules

- Populate the table with REAL items found from the grep scan. Do not invent debt.
- If zero TODO/FIXME found, write "No TODO/FIXME comments found — debt tracker starts empty."
- Owner column starts as "—" (unassigned).
- Each item description must be concrete: what, where, and why it matters.
