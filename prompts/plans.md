# Task: Generate docs/PLANS.md

**Output:** `{{PROJECT_DIR}}/docs/PLANS.md`

You are creating the docs/PLANS.md document — the team's roadmap and active work tracker.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Check README for roadmap or planned features"
3. "Check git log for recent work patterns and feature areas"
4. "Check for open TODO items or milestone references"
5. "Write docs/PLANS.md following the exact template"
6. "Verify the document reflects actual project state (not generic advice)"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Template

```markdown
# Plans

Updated: {{today's date}}

## Active Work

{{List what's actively being built based on git log and README. If nothing is clear, write "No active milestones identified — update this when work begins."}}

| Item | Status | Owner | Target |
|------|--------|-------|--------|
| {{feature or task}} | In Progress | — | — |

## Roadmap

### Near Term (next 4 weeks)

- {{Item based on observed direction}}

### Medium Term (next quarter)

- {{Item}}

### Long Term (6+ months)

- {{Item — or "Not yet defined"}}

## Milestones

| Milestone | Status | Date |
|-----------|--------|------|
| Initial release | {{completed or pending}} | — |

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| {{today}} | Set up claude-harness scaffold | Enable agent-first development |
```

## Rules

- Base active work on EVIDENCE (git log, README, open issues mentioned in code).
- If roadmap is unknown, write "Not yet defined" rather than inventing items.
- The Decisions Log starts with one entry: the harness setup.
