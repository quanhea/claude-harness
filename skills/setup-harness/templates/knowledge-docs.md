# Template: Top-Level Knowledge Documents

> The article's knowledge store screenshot shows these top-level docs inside `docs/`.
> Each is a focused document covering one concern. Generate ALL that apply to the project.

---

## File: docs/DESIGN.md

```markdown
# Design

> Design system and principles for {{project-name}}.
> This is the source of truth for visual design, component patterns, and UX conventions.

## Design System

_Describe the design system: component library, tokens, themes, spacing scale, color palette._

## Component Patterns

_Describe reusable component patterns: layout patterns, form patterns, navigation patterns._

## UX Conventions

_Describe UX conventions: error states, loading states, empty states, responsive behavior._

## References

See `docs/references/` for external design system documentation (e.g., `design-system-reference-llms.txt`).
```

Only generate this if the project has a frontend (React, Vue, Angular, Svelte, Next.js, etc.).

---

## File: docs/FRONTEND.md

```markdown
# Frontend

> Frontend architecture and conventions for {{project-name}}.

## Stack

- **Framework**: {{frontend-framework}}
- **Styling**: {{css-approach — Tailwind, CSS Modules, styled-components, etc.}}
- **State management**: {{state-management — Redux, Zustand, Pinia, etc.}}
- **Routing**: {{routing-approach}}

## Component Organization

_Describe how components are organized: by feature, by type, atomic design, etc._

## Data Fetching

_Describe the data fetching pattern: React Query, SWR, server components, etc._

## Build & Bundle

_Describe build tooling, code splitting, lazy loading conventions._
```

Only generate this if the project has a frontend.

---

## File: docs/PLANS.md

```markdown
# Plans

> Planning conventions for {{project-name}}.

## How We Plan

- **Small changes** (< 1 day): Ephemeral lightweight plans — describe in the PR
- **Medium changes** (1-5 days): Create an execution plan in `docs/exec-plans/active/`
- **Large changes** (> 5 days): Create a design doc in `docs/design-docs/` first, then execution plans

## Active Plans

See `docs/exec-plans/active/` for current work in progress.

## Completed Plans

See `docs/exec-plans/completed/` for past work with decision logs.

## Technical Debt

See `docs/exec-plans/tech-debt-tracker.md` for known debt items.

## Merge Philosophy

- **Minimal blocking merge gates.** PRs are short-lived. Don't let perfect be the enemy of shipped.
- **Corrections are cheap, waiting is expensive.** In a system where agent throughput exceeds human attention, it's better to fix a mistake quickly than to prevent all mistakes slowly.
- **Test flakes get follow-up runs**, not blocking gates. If a test flakes, open a follow-up to fix the flake — don't block the PR.
- **Small refactoring PRs can auto-merge.** Use `gh pr merge --auto --squash` for cleanup PRs that only touch formatting, dead code, or doc fixes.
- **Every PR should be reviewable in under 5 minutes.** If it's bigger, split it.
```

Generate for all projects.

---

## File: docs/PRODUCT_SENSE.md

```markdown
# Product Sense

> Product context and user understanding for {{project-name}}.
> Agents need product context to make good decisions about UX, error messages,
> feature prioritization, and edge case handling.

## What This Product Does

_1-3 sentences describing the product's purpose and value proposition._

## Users

_Who uses this product? What are their key workflows?_

## Key User Journeys

_List the critical paths users take through the product._

1. _Journey 1: ..._
2. _Journey 2: ..._

## Product Principles

_What matters most? Speed? Accuracy? Simplicity? Data privacy?_

## Domain Language

_Key domain terms and their definitions, so agents use consistent terminology._

| Term | Definition |
|------|-----------|
| _term_ | _definition_ |
```

Generate for all projects.

---

## File: docs/RELIABILITY.md

```markdown
# Reliability

> Reliability requirements and conventions for {{project-name}}.

## SLAs / SLOs

_Define service level objectives if applicable._

| Metric | Target | Current |
|--------|--------|---------|
| Availability | _e.g., 99.9%_ | — |
| Latency (p50) | _e.g., 200ms_ | — |
| Latency (p99) | _e.g., 2s_ | — |
| Error rate | _e.g., < 0.1%_ | — |

## Error Handling

- Parse and validate at boundaries
- Use typed errors with structured metadata
- Never swallow errors silently
- Log errors with enough context to diagnose without reproducing

## Graceful Degradation

_How should the system behave when dependencies fail?_

## Observability

- Structured logging (see `.claude/rules/architecture.md`)
- Metrics via {{metrics-approach}}
- Traces via {{tracing-approach}}
- See `docs/references/` for observability stack docs

## Incident Response

_How are incidents detected, triaged, and resolved?_
```

Generate for all projects.

---

## File: docs/SECURITY.md

```markdown
# Security

> Security conventions and requirements for {{project-name}}.

## Authentication

_Describe the auth approach: JWT, sessions, OAuth, API keys, etc._

## Authorization

_Describe the authz model: RBAC, ABAC, resource-based, etc._

## Data Protection

- Sensitive data is never logged (passwords, tokens, PII)
- Environment secrets are in env vars, never in code
- API keys and credentials are in `.env` (gitignored)

## Input Validation

- All external input is validated at system boundaries (see boundary rules)
- SQL/NoSQL queries use parameterized statements, never string concatenation
- HTML output is escaped to prevent XSS

## Dependencies

- Dependencies are pinned to specific versions
- Known vulnerabilities are tracked and patched

## Secrets Management

_Describe how secrets are stored and accessed._

## Security Checklist for New Features

- [ ] Input validated at boundary?
- [ ] Auth/authz checked?
- [ ] Sensitive data excluded from logs?
- [ ] Dependencies audited?
```

Generate for all projects.

---

## File: docs/references/README.md

```markdown
# References

External reference material for {{project-name}}.

## LLM-Friendly Documentation

Store `*-llms.txt` files here for external libraries and APIs.
These are machine-readable docs that agents can use to understand
dependencies without leaving the repo.

### How to Add

1. Check if the library publishes an `llms.txt` file (many modern libraries do)
2. Download it: `curl -o docs/references/<name>-llms.txt https://<library>/llms.txt`
3. Or create one from the library's API docs

### Current References

_No references yet. Add llms.txt files for your key dependencies._

Example for a Next.js + Tailwind project:
- `nextjs-llms.txt` — Next.js API reference
- `tailwind-llms.txt` — Tailwind CSS classes reference
- `design-system-reference-llms.txt` — Your design system docs
```

Generate for all projects (replaces the simpler `references/index.md`).

---

## Adaptation Instructions

1. Replace all `{{placeholders}}`
2. DESIGN.md and FRONTEND.md — only generate if project has a frontend
3. RELIABILITY.md — adapt SLAs to the project type (library vs service vs app)
4. SECURITY.md — adapt auth/authz to the project's actual approach
5. PRODUCT_SENSE.md — leave sections as TODOs if you can't determine from code
6. PLANS.md — always generate, it explains the planning convention
7. references/README.md — replaces the simpler index.md we had before
