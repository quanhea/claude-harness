---
description: Generate docs/QUALITY_SCORE.md
outputs: ["docs/QUALITY_SCORE.md"]
---

# Task: Generate docs/QUALITY_SCORE.md

**Output:** `{{PROJECT_DIR}}/docs/QUALITY_SCORE.md`

You are generating the initial quality scorecard for this project. This document tracks quality grades per domain and is re-graded by re-running this task or running `/sync`.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Check for existing tests and estimate test coverage signal"
3. "Check for linting config and CI status"
4. "Check for existing documentation (README, ARCHITECTURE, CLAUDE.md)"
5. "Write docs/QUALITY_SCORE.md following the exact template"
6. "Verify all grades are assigned (A/B/C/D/F or N/A)"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Context

Signals to check:
- `ls test/ tests/ spec/ __tests__/ 2>/dev/null` → test files exist?
- `cat package.json | grep -i test` or equivalent → test command exists?
- `ls .eslintrc* .prettierrc ruff.toml .golangci.yml 2>/dev/null` → linter config?
- Does ARCHITECTURE.md exist? README.md? CLAUDE.md?

## Grading Scale

- **A**: Excellent — comprehensive coverage, no major gaps
- **B**: Good — solid but has some gaps worth improving
- **C**: Fair — functional but significant gaps
- **D**: Poor — minimal coverage, major gaps
- **F**: Missing — not present at all
- **N/A**: Not applicable for this project type

## Template

```markdown
# Quality Score

Last updated: {{today's date}}

## Scores

| Domain | Grade | Notes |
|--------|-------|-------|
| Test Coverage | {{grade}} | {{e.g. "Jest tests present, coverage unknown"}} |
| Code Linting | {{grade}} | {{e.g. "ESLint configured, no CI enforcement"}} |
| Documentation | {{grade}} | {{e.g. "README exists, ARCHITECTURE.md missing"}} |
| Architecture | {{grade}} | {{e.g. "Clear module structure, no boundary rules"}} |
| Security | {{grade}} | {{e.g. "No security review, secrets in .env"}} |
| Observability | {{grade}} | {{e.g. "No logging standard defined"}} |
| CI/CD | {{grade}} | {{e.g. "GitHub Actions present, deploys manually"}} |
| Dependencies | {{grade}} | {{e.g. "Lockfile present, no audit in CI"}} |

## Priority Improvements

1. {{Highest-value improvement based on grades above}}
2. {{Second priority}}
3. {{Third priority}}

## History

| Date | Test | Lint | Docs | Arch | Security | Observability | CI |
|------|------|------|------|------|----------|--------------|-----|
| {{today}} | {{grade}} | {{grade}} | {{grade}} | {{grade}} | {{grade}} | {{grade}} | {{grade}} |
```

## Rules

- Base grades on EVIDENCE, not assumptions. A "C" or "D" with honest reasoning is better than an unjustified "A".
- The History table starts with just one row (today's snapshot).
- Priority Improvements must be concrete actions, not vague advice.
