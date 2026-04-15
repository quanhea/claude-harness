---
description: Generate docs/RELIABILITY.md
outputs: ["docs/RELIABILITY.md"]
---

# Task: Generate docs/RELIABILITY.md

**Output:** `{{PROJECT_DIR}}/docs/RELIABILITY.md`

You are creating docs/RELIABILITY.md — failure modes, SLOs, and on-call runbook for this project.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Check for error handling patterns in source code (sample 5-10 files)"
3. "Check for any existing runbooks, SLO files, or reliability docs"
4. "Check infrastructure for monitoring signals (Datadog, Sentry, etc.)"
5. "Write docs/RELIABILITY.md following the exact template"
6. "Verify failure modes are based on actual code patterns found"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Template

```markdown
# Reliability

Updated: {{today's date}}

## SLOs

| Metric | Target | Measurement |
|--------|--------|-------------|
| {{e.g. Availability}} | {{e.g. 99.9%}} | {{e.g. Uptime monitor}} |
| {{e.g. API p99 latency}} | {{e.g. < 500ms}} | {{e.g. Not yet measured}} |

*If SLOs are not yet defined, write "SLOs not yet established."*

## Known Failure Modes

| Failure | Likelihood | Impact | Mitigation |
|---------|-----------|--------|------------|
| {{e.g. Database connection pool exhausted}} | Medium | High | {{e.g. Connection pooling configured, alerts on pool size}} |
| {{failure found from code review}} | {{likelihood}} | {{impact}} | {{mitigation or "None yet"}} |

## On-Call Runbook

### Alerts

| Alert | Meaning | Response |
|-------|---------|----------|
| {{Alert name}} | {{What it means}} | {{What to do}} |

### Common Issues

**{{Issue 1, e.g. "High memory usage"}}**
1. Check: `{{command}}`
2. Fix: `{{action}}`
3. Escalate if: `{{condition}}`

### Rollback Procedure

{{How to roll back a bad deployment. If CI/CD is not configured, write "Manual rollback: revert the commit and deploy."}}

## Incident Response

1. Acknowledge alert within {{N}} minutes
2. Post in {{channel}} with status
3. Diagnose using runbook above
4. Fix or escalate to {{owner}}
5. Write post-mortem for P0/P1 incidents
```

## Rules

- Base failure modes on actual code patterns (missing error handling, external dependencies, etc.).
- If this is a library (not an app), most SLO sections can be N/A.
- Write "Not yet established" rather than inventing SLOs.
