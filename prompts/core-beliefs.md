---
description: Generate docs/design-docs/core-beliefs.md
outputs: ["docs/design-docs/core-beliefs.md"]
---

# Task: Generate docs/design-docs/core-beliefs.md

**Output:** `{{PROJECT_DIR}}/docs/design-docs/core-beliefs.md`

You are documenting this team's core engineering beliefs — the non-negotiable principles that shape every decision. Discover these from actual code patterns, not opinions.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Read existing README.md and CONTRIBUTING.md for stated values"
3. "Sample 10-15 source files to detect patterns (error handling, naming, structure)"
4. "Look for repeated patterns that reveal unstated beliefs"
5. "Write docs/design-docs/core-beliefs.md following the exact template"
6. "Verify beliefs are grounded in observed patterns, not generic advice"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Context

Sample source files and look for:
- How errors are handled (panic? return error? throw? log and continue?)
- How dependencies are injected
- Whether tests are colocated or separate
- Whether comments explain WHY or just WHAT
- Single responsibility vs. multi-concern modules

## Template

```markdown
# Core Beliefs

These are the principles this team has implicitly or explicitly adopted.
They should guide every design decision.

Last updated: {{today's date}}

## On Code Quality

- **{{Belief 1}}**: {{1-2 sentence explanation grounded in observed pattern}}
- **{{Belief 2}}**: {{1-2 sentence explanation}}

## On Architecture

- **{{Belief}}**: {{explanation}}
- **{{Belief}}**: {{explanation}}

## On Testing

- **{{Belief}}**: {{explanation grounded in what the test suite looks like}}

## On Reliability

- **{{Belief}}**: {{explanation}}

## On Collaboration

- **{{Belief}}**: {{explanation from git history, PR patterns}}

---

*These beliefs were inferred from the codebase on {{today's date}}.*
*Update this document when the team's philosophy evolves.*
```

## Rules

- Each belief must be a SHORT name (3-5 words) followed by an explanation.
- Beliefs must be grounded in OBSERVED patterns — not generic engineering wisdom.
- If you cannot infer a belief from evidence, skip that section rather than inventing one.
- Minimum 5 total beliefs, maximum 15.
- Do NOT reproduce the Harness Engineering principles verbatim — discover THIS team's beliefs.
