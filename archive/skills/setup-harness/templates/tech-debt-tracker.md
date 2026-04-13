# Template: docs/exec-plans/tech-debt-tracker.md

> Article: "docs/exec-plans/tech-debt-tracker.md" — technical debt tracked as first-class artifact
> This is a TEMPLATE. The quality skill and gardener agent populate this over time.

---

```markdown
# Technical Debt Tracker

> Technical debt items for {{project-name}}.
> Updated by `/quality` scans and `@gardener` agent.
> Debt is a high-interest loan — pay it down continuously.

## Active Debt

| ID | Domain | Severity | Description | Impact | Added |
|----|--------|----------|-------------|--------|-------|
| _none yet_ | — | — | Run `/quality` to scan for issues | — | — |

## Severity Legend

| Severity | Meaning | Action |
|----------|---------|--------|
| 🔴 Critical | Blocks work or causes failures | Fix this sprint |
| 🟡 High | Degrades quality or velocity | Fix within 2 weeks |
| 🔵 Medium | Minor friction, no immediate impact | Fix when touching this area |
| ⚪ Low | Cosmetic or nice-to-have | Fix opportunistically |

## Resolved Debt

| ID | Domain | Description | Resolution | Date |
|----|--------|-------------|------------|------|
| _none yet_ | — | — | — | — |

## Principles

- Every debt item has a clear **impact** statement (what goes wrong if we ignore it)
- Debt is prioritized by impact, not by age
- Small debt items should be fixed immediately (< 30 min), not tracked here
- Large debt items should have an execution plan in `docs/exec-plans/active/`
```
