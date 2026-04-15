---
description: Generate docs/PRODUCT_SENSE.md
outputs: ["docs/PRODUCT_SENSE.md"]
---

# Task: Generate docs/PRODUCT_SENSE.md

**Output:** `{{PROJECT_DIR}}/docs/PRODUCT_SENSE.md`

You are creating docs/PRODUCT_SENSE.md — a document that captures who the users are, what problems they have, and what the product is trying to achieve.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Read README.md for problem statement and target users"
3. "Read any docs/ files that mention users, goals, or use cases"
4. "Write docs/PRODUCT_SENSE.md following the exact template"
5. "Verify user descriptions are specific, not generic"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Template

```markdown
# Product Sense

Updated: {{today's date}}

## The Problem

{{What problem does this project solve? 2-4 sentences. Be specific. If unknown from README, write "Not yet documented — fill in with the actual user problem."}}

## Users

### Primary Users

**{{User type, e.g. "Developers", "Operations teams", "End customers"}}**
- {{What they do}}
- {{Their pain point this solves}}
- {{How they use this product}}

### Secondary Users

{{Other user types if applicable, or "None identified."}}

## Goals

| Goal | Why It Matters |
|------|---------------|
| {{Goal 1}} | {{Reason}} |
| {{Goal 2}} | {{Reason}} |

## Non-Goals

Things explicitly out of scope:
- {{Non-goal 1 — what this project is NOT trying to do}}
- {{Non-goal 2}}

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| {{Metric, e.g. "API response time"}} | {{Target}} | Unknown |

## Key User Journeys

### {{Journey 1, e.g. "Developer sets up project for the first time"}}

1. {{Step 1}}
2. {{Step 2}}
3. {{Step 3}}
```

## Rules

- Extract user descriptions from README. If not available, use generic but honest placeholders.
- Non-Goals must be REAL non-goals that avoid scope creep, not invented.
- Success Metrics should reflect what the project actually tracks (or "Unknown" if not defined).
