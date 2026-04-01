# Template: .claude/rules/

> Generate these rule files in the user's `.claude/rules/` directory.
> Rules are loaded by Claude Code automatically. Path-scoped rules only load when relevant.

---

## File: .claude/rules/architecture.md

This rule has NO frontmatter (loads every session).

```markdown
# Architecture Rules

## Dependency Direction

Dependencies MUST flow in one direction within each domain:
Types → Config → Repository → Service → Runtime → UI

Never:
- Import UI from Service/Repository layers
- Create circular dependencies between domains
- Use implicit globals — pass dependencies explicitly

## Boundaries

- Parse and validate ALL external data at system boundaries
- Internal code trusts already-validated data — no redundant checks
- Cross-domain communication goes through explicit public APIs
- Cross-cutting concerns (auth, logging, metrics) use provider interfaces

## File Organization

- One concept per file, max ~300 lines
- Co-locate tests: `foo.{{ext}}` → `foo.test.{{ext}}`
- Index files export public API only — no logic

## When Adding New Code

1. Check `docs/ARCHITECTURE.md` for which domain/layer this belongs to
2. Follow existing patterns in that domain
3. If creating a new domain, update `docs/ARCHITECTURE.md`
4. If changing boundaries, update this rule file and architecture docs
```

### Language-specific additions

**For TypeScript/JavaScript projects**, append:
```markdown
## TypeScript/JavaScript

- Prefer `const` over `let`, never `var`
- Use strict TypeScript — no `any` unless truly necessary
- Parse external data with a schema validator (Zod, etc.) at boundaries
- Prefer named exports over default exports
```

**For Python projects**, append:
```markdown
## Python

- Use type hints on all public functions
- Use Pydantic or dataclasses for data shapes
- Validate external input at boundaries with schema validation
```

**For Go projects**, append:
```markdown
## Go

- Handle all errors explicitly — no blank `_` for error returns
- Use interfaces for dependency injection
- Keep packages focused — one responsibility per package
```

**For Rust projects**, append:
```markdown
## Rust

- Prefer Result over panic for recoverable errors
- Use strong types for domain concepts (newtypes)
- Derive traits where possible
```

---

## File: .claude/rules/testing.md

This rule IS path-scoped (only loads when editing test files).

```yaml
---
paths:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/__tests__/**"
  - "**/test/**"
  - "**/tests/**"
---
```

```markdown
# Testing Rules

## Framework

Use {{test-framework}}. Run tests with: `{{test-command}}`

## Conventions

- Test files live next to source: `foo.{{ext}}` → `foo.test.{{ext}}`
- Each test file tests one module
- Use descriptive test names that explain the behavior, not the implementation
- Group related tests with describe/context blocks

## What to Test

- Public API of each module
- Edge cases and error paths
- Integration points (API boundaries, database queries)
- Business logic — especially conditional behavior

## What NOT to Test

- Private implementation details
- Framework internals
- Simple getters/setters with no logic
- Type-only code

## Test Quality

- Tests should be independent — no shared mutable state
- Tests should be fast — mock external services, not internal code
- Each test should have a single assertion focus
- Prefer real implementations over mocks for internal dependencies
```

---

## File: .claude/rules/documentation.md

This rule has NO frontmatter (loads every session).

```markdown
# Documentation Rules

## System of Record

The `docs/` directory is the system of record.
If knowledge isn't in the repo, it doesn't exist for agents.

## When to Update Docs

- **New domain/module**: Update `docs/ARCHITECTURE.md`
- **New pattern/convention**: Add to relevant architecture docs
- **Design decision**: Create a design doc in `docs/design-docs/`
- **API change**: Update relevant product specs
- **Quality change**: Reflected in `docs/QUALITY.md` by quality scans

## Documentation Quality

- Be specific and mechanical — agents can't interpret vague prose
- Use examples, not abstract descriptions
- Link to source files when referencing code
- Keep docs under 200 lines — split large docs into focused sub-documents
- Remove stale information rather than marking it as outdated

## Progressive Disclosure

- CLAUDE.md is the table of contents (~100 lines)
- Architecture docs provide the structural map
- Design docs go deep on specific decisions
- Don't duplicate — link to the source of truth
```

---

## Adaptation Instructions

1. Fill in `{{ext}}`, `{{test-framework}}`, `{{test-command}}` from project detection
2. Add the appropriate language-specific section to architecture.md
3. For the testing rule, adjust path patterns if the project uses a different convention
4. If `.claude/rules/` already exists, don't overwrite — only add missing files
