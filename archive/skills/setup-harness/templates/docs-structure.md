# Template: docs/ Directory Structure

> Generate all these files in the user's project. Each section below is one file.

---

## File: QUALITY_SCORE.md

```markdown
# Quality Grades

Quality assessment for {{project-name}}.
Updated by `/quality` skill or `@gardener` agent.

## Grading Scale

| Grade | Meaning |
|-------|---------|
| A | Production-ready, well-tested, documented |
| B | Functional, reasonable test coverage, minor gaps |
| C | Works but has significant gaps |
| D | Fragile, undertested, or poorly documented |
| F | Broken or unmaintainable |

## Domain Grades

| Domain | Architecture | Testing | Docs | Reliability | Notes |
|--------|-------------|---------|------|-------------|-------|
{{for-each-domain:}}
| {{domain}} | — | — | — | — | Not yet graded |

## Technical Debt Tracker

_Track known technical debt items here. Use `/quality` to scan for issues._
```

---

## File: docs/design-docs/index.md

```markdown
# Design Documents

Design documents for {{project-name}}.

## Status Legend

| Status | Meaning |
|--------|---------|
| ✅ Verified | Design matches implementation |
| ⚠️ Draft | Proposed, not yet implemented |
| 🔄 In Progress | Partially implemented |
| ❌ Superseded | Replaced by a newer design |

## Documents

_No design documents yet. Create one with `/plan`._
```

---

## File: docs/exec-plans/active/.gitkeep

Empty file. Just create the directory.

## File: docs/exec-plans/completed/.gitkeep

Empty file. Just create the directory.

---

## File: docs/product-specs/index.md

```markdown
# Product Specifications

Product specs for {{project-name}}.

_No specs yet. Add product specifications here as the project evolves._
```

---

## File: docs/references/index.md

```markdown
# References

External reference material for {{project-name}}.

Store LLM-friendly documentation (e.g., `*-llms.txt` files) and API references here.
Agents can read these to understand external dependencies without leaving the repo.

_No references yet. Add external docs, API references, or llms.txt files here._
```

---

## File: docs/encyclopedia/index.md

```markdown
# Encyclopedia

Auto-generated codebase knowledge for {{project-name}}.

Run `/harness-learn` or the `@gardener` agent to populate this from the codebase.

## Contents

_Not yet generated._
```

---

## Adaptation Instructions

1. Replace all `{{placeholders}}` with real project info
2. In QUALITY_SCORE.md, list actually detected domains — don't invent them
3. If `docs/` already exists, don't overwrite existing files — only add missing ones
4. Create the `.gitkeep` files to preserve empty directories in git
