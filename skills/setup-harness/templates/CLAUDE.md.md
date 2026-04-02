# Template: .claude/CLAUDE.md

> This generates the table-of-contents CLAUDE.md.
> It MUST be concise (the article says ~100 lines but discover the right size for this project).
> It points to deeper docs — it does not contain details itself.
> NEVER hardcode conventions — discover them from the project.

---

## How to Generate

### For EXISTING projects:

**Launch an Explore agent** to discover the project essentials:

```
Agent(subagent_type: "Explore", prompt: "Find the essential project info for CLAUDE.md:
1. Project name (from package.json, Cargo.toml, go.mod, pyproject.toml, or directory name)
2. Language and framework
3. Package manager
4. Test framework and test command
5. Build command
6. Lint/format command
7. Dev server command
8. Top-level domains/modules
9. Whether it's a monorepo
10. Any existing CLAUDE.md or README with project conventions
Report all findings.")
```

### For GREENFIELD projects:

Use the detected language/framework from the shell injection context. Propose commands
based on the framework's standard tooling (research if unsure).

---

## Output Structure

Write `.claude/CLAUDE.md` — concise, pointers only:

```markdown
# {{project-name}}

> Table of contents. Follow pointers for depth. Keep this concise.

## Quick Reference

- **Language**: {{discovered}}
- **Framework**: {{discovered}}
- **Package manager**: {{discovered}}
- **Test framework**: {{discovered}}

## Commands

{{discovered — only list commands that actually exist in the project:}}
- **Build**: `{{discovered build command}}`
- **Test**: `{{discovered test command}}`
- **Lint**: `{{discovered lint command}}`
- **Dev**: `{{discovered dev server command}}`

## Architecture

See `docs/ARCHITECTURE.md` for module boundaries and dependency rules.

## Knowledge Base

| Path | What's there |
|------|-------------|
| `docs/ARCHITECTURE.md` | Architecture map, dependency rules |
| `docs/QUALITY.md` | Quality grades per domain |
| `docs/design-docs/` | Design documents and decisions |
| `docs/exec-plans/` | Execution plans (active + completed) |
| `docs/product-specs/` | Product specifications |
| `docs/references/` | External reference material |
| `docs/INFRASTRUCTURE.md` | Services, CI/CD, cloud, databases |

## Principles

1. Repository is the system of record — if it's not in the repo, it doesn't exist
2. Progressive disclosure — start here, follow pointers to depth
3. Enforce mechanically — rules are in code, not prose
4. Agent legibility — optimize for reasoning, not aesthetics
5. Correct > clever — well-tested, composable code wins
```

## Adaptation Instructions

1. ALL commands must come from actual project config — never invent commands
2. Only list knowledge base paths for docs that were actually generated
3. If the project already has CLAUDE.md, READ it first and MERGE — preserve user content
4. If monorepo, add a note about package structure
5. Remove any rows from the knowledge table that don't apply
