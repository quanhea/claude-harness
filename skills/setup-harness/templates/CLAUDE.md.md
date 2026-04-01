# Template: .claude/CLAUDE.md

> This is a TEMPLATE. Adapt it to the specific project. Replace all {{placeholders}}.
> The final file MUST be under 100 lines. It is a TABLE OF CONTENTS, not an encyclopedia.

---

```markdown
# {{project-name}}

> This file is a table of contents. For deep context, follow the pointers below.
> Keep this under 100 lines. Details belong in `docs/`.

## Quick Reference

- **Language**: {{primary-language}}
- **Framework**: {{framework-or-none}}
- **Package manager**: {{package-manager}}
- **Test framework**: {{test-framework-or-none}}

## Commands

- **Build**: `{{build-command}}`
- **Test**: `{{test-command}}`
- **Lint**: `{{lint-command}}`

## Architecture

See `docs/ARCHITECTURE.md` for the full architecture map including:
- Module/domain boundaries and dependency rules
- Data flow overview
- Key abstractions and patterns

## Knowledge Base

All project knowledge lives in `docs/`:

| Path | What's there |
|------|-------------|
| `docs/ARCHITECTURE.md` | Architecture map, module boundaries, dependency rules |
| `docs/QUALITY.md` | Quality grades per domain |
| `docs/design-docs/` | Design documents and decisions |
| `docs/exec-plans/` | Execution plans (active + completed) |
| `docs/product-specs/` | Product specifications |
| `docs/references/` | External reference material |
| `docs/encyclopedia/` | Auto-generated codebase knowledge |

## Rules

Architecture rules are enforced in `.claude/rules/`. Key rules:
- **architecture.md** — Module boundaries, dependency direction, layer constraints
- **testing.md** — Test conventions (loaded when editing test files)
- **documentation.md** — Documentation maintenance rules

## Skills

| Skill | What it does |
|-------|-------------|
| `/sync` | Re-analyze project and update docs |
| `/review` | Architecture-aware code review |
| `/plan` | Create an execution plan for a task |
| `/quality` | Grade quality per domain |

## Agents

| Agent | Role |
|-------|------|
| `@reviewer` | Code review with architecture awareness |
| `@architect` | Architecture analysis and recommendations |
| `@gardener` | Find and fix stale docs, dead code, quality issues |

## Principles

1. **Repository is the system of record** — if it's not in the repo, it doesn't exist
2. **Progressive disclosure** — start here, follow pointers to depth
3. **Enforce mechanically** — rules are in code, not prose
4. **Agent legibility** — optimize for Claude's reasoning, not human aesthetics
5. **Correct > clever** — boring, composable, well-tested code wins
```

## Adaptation Instructions

When generating this file for a real project:

1. Fill in all `{{placeholders}}` from detected project info
2. Remove any rows from Commands that don't apply (e.g., no lint command)
3. Add project-specific domains if detected (e.g., `## Domains` section)
4. For monorepos, add a note about package structure
5. If the project already has a CLAUDE.md, MERGE — don't overwrite
6. The final file must stay under 100 lines
