# Template: .claude/rules/

> Rules are loaded by Claude Code automatically every session.
> For existing projects: rules MUST reflect the project's actual conventions (use Explore agent).
> For greenfield: rules should reflect researched best practices.
> NEVER hardcode conventions — discover or research them.

---

## File: .claude/rules/architecture.md

This rule has NO frontmatter (loads every session).

### How to Generate

**Launch an Explore agent** to discover the architecture rules:

```
Agent(subagent_type: "Explore", prompt: "Analyze this project's architecture rules:
1. What is the dependency direction? Which modules import which?
2. Are there layers (types, services, controllers, etc.)? What's the allowed direction?
3. How are cross-cutting concerns handled (auth, logging, metrics)?
4. What's the file organization pattern? Max file size trend?
5. Are tests co-located or in a separate directory? What's the naming pattern?
6. What boundary validation exists? Are external inputs parsed/validated at entry?
7. Are there any existing lint configs or architecture rules already documented?
Report specific findings with file paths.")
```

Write the rule based on findings. Structure:

```markdown
# Architecture Rules

## Dependency Direction

{{discovered — state the actual dependency direction rule.
If no clear rule exists, propose one based on the import graph analysis.}}

## Boundaries

{{discovered — how external data is handled at boundaries.
If no pattern exists, state the principle: validate at entry, trust internally.}}

## File Organization

{{discovered — actual file organization conventions.
How are files sized? How are tests organized? What do index files contain?}}

## When Adding New Code

1. Check `ARCHITECTURE.md` for which domain/layer this belongs to
2. Follow existing patterns in that domain
3. If creating a new domain, update `ARCHITECTURE.md`
4. If changing boundaries, update this rule file and architecture docs
```

### Language-specific additions

**Launch an Explore agent** to discover language-specific conventions:

```
Agent(subagent_type: "Explore", prompt: "Find language-specific coding conventions in this project:
1. Import style (named vs default exports, absolute vs relative)
2. Type system usage (strict types? any/unknown usage?)
3. Data validation approach (what library? where is it used?)
4. Async patterns (promises, async/await, callbacks?)
5. Error handling specifics (custom error classes? error codes?)
Report with examples from actual code.")
```

Append language-specific conventions discovered to the rule.

---

## File: .claude/rules/testing.md

This rule IS path-scoped (only loads when editing test files).

### How to Generate

**Launch an Explore agent** to discover testing conventions:

```
Agent(subagent_type: "Explore", prompt: "Analyze this project's testing conventions:
1. What test framework is used? What's the test command?
2. Where do test files live? (co-located? separate dir? naming pattern?)
3. How are tests structured? (describe blocks? test classes? flat?)
4. What mocking approach is used? (jest.mock? dependency injection? factories?)
5. What fixture/setup patterns are used? (beforeEach? factories? builders?)
6. Are there integration tests vs unit tests? How are they separated?
Read 3-5 existing test files and extract the patterns.
Report with specific examples from actual test files.")
```

Write the frontmatter with discovered path patterns:

```yaml
---
paths:
  {{discovered test file patterns — e.g.:}}
  {{- "**/*.test.*"}}
  {{- "**/*.spec.*"}}
  {{- "**/__tests__/**"}}
  {{- "**/test/**"}}
---
```

Write the rule body based on findings:

```markdown
# Testing Rules

## Framework

{{discovered — test framework and test command}}

## Conventions

{{discovered — from actual test files, not hardcoded examples.
How are tests organized? What patterns are used? What should new tests look like?}}

## What to Test

{{discovered — what the project actually tests.
Look at existing test coverage to determine the testing philosophy.}}

## What NOT to Test

{{discovered — are there patterns the project explicitly avoids testing?}}
```

---

## File: .claude/rules/documentation.md

This rule has NO frontmatter (loads every session). This one is less project-specific
and more about the harness methodology, so it can be more prescriptive:

```markdown
# Documentation Rules

## System of Record

The `docs/` directory is the system of record.
If knowledge isn't in the repo, it doesn't exist for agents.

## When to Update Docs

- **New domain/module**: Update `ARCHITECTURE.md`
- **New pattern/convention**: Add to relevant architecture docs
- **Design decision**: Create a design doc in `docs/design-docs/`
- **API change**: Update relevant product specs

## Documentation Quality

- Be specific and mechanical — agents can't interpret vague prose
- Use examples, not abstract descriptions
- Link to source files when referencing code
- Remove stale information rather than marking it as outdated

## Progressive Disclosure

- CLAUDE.md is the table of contents
- Architecture docs provide the structural map
- Design docs go deep on specific decisions
- Don't duplicate — link to the source of truth
```

---

## Adaptation Instructions

1. ALWAYS launch Explore agents to discover conventions before writing rules
2. For existing projects: rules describe what IS, not what should be
3. For greenfield: launch a research agent to find best practices for the language/framework
4. Test path patterns must match the project's actual test file naming
5. If `.claude/rules/` already exists, read existing rules and MERGE
