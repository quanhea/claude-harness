---
description: Generate .claude/rules/architecture.md
outputs: [".claude/rules/architecture.md"]
---

# Task: Generate .claude/rules/architecture.md

**Output:** `{{PROJECT_DIR}}/.claude/rules/architecture.md`

You are generating the architecture rule file — loaded every Claude session to enforce module boundaries and dependency direction.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Launch Explore agent to discover architecture rules — dependency direction, layers, file organization"
3. "Launch Explore agent to discover language-specific conventions — imports, types, async patterns, error handling"
4. "Read existing .claude/rules/architecture.md if present (merge)"
5. "Write .claude/rules/architecture.md following the exact template"
6. "Verify all rules reference actual project patterns, not invented examples"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Explore Agent Prompt (Task 2)

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

## Explore Agent Prompt (Task 3)

```
Agent(subagent_type: "Explore", prompt: "Find language-specific coding conventions in this project:
1. Import style (named vs default exports, absolute vs relative paths)
2. Type system usage (strict types? any/unknown usage? explicit return types?)
3. Data validation approach (what library? where is it used? at what layer?)
4. Async patterns (promises, async/await, callbacks — what's dominant?)
5. Error handling specifics (custom error classes? error codes? Result types?)
Report with examples from actual code files — include file paths.")
```

## Template

```markdown
# Architecture Rules

## Dependency Direction

{{discovered — state the actual dependency direction rule.
If no clear rule exists, propose one based on the import graph analysis.
Example: "src/types → imported by everything / src/services → may not import src/cli"}}

## Boundaries

{{discovered — how external data is handled at boundaries.
Example: "All user input is validated at the HTTP handler layer before reaching services."
If no pattern exists, state: "Validate at entry, trust internally."}}

## File Organization

{{discovered — actual file organization conventions.
How are files sized? How are tests organized? What do index files contain?}}

## Language Conventions

{{discovered — from actual code:
- Import style
- Type system usage
- Async patterns
- Error handling approach}}

## When Adding New Code

1. Check `ARCHITECTURE.md` for which domain/layer this belongs to
2. Follow existing patterns in that domain
3. If creating a new domain, update `ARCHITECTURE.md`
4. If changing boundaries, update this rule file and architecture docs
```

## Rules

- This file has NO frontmatter — it loads every session.
- Rules must describe what IS in the codebase, not what should be.
- All examples must use actual file paths and module names from the project.
- If `.claude/rules/architecture.md` already exists, read it first and MERGE.
