# Task: Generate .claude/rules/testing.md

**Output:** `{{PROJECT_DIR}}/.claude/rules/testing.md`

You are generating the testing rule file — path-scoped to load only when editing test files. It must describe the actual test conventions found in this codebase.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Launch Explore agent to discover test conventions — framework, file location, naming, structure, mocking"
3. "Read 3-5 actual test files to extract concrete patterns"
4. "Read existing .claude/rules/testing.md if present (merge)"
5. "Write .claude/rules/testing.md with correct frontmatter path patterns"
6. "Verify path patterns in frontmatter match actual test file naming"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Explore Agent Prompt (Task 2)

```
Agent(subagent_type: "Explore", prompt: "Analyze this project's testing conventions:
1. What test framework is used? What's the test command?
2. Where do test files live? (co-located? separate dir? naming pattern?)
   Find actual test files with: find . -name '*.test.*' -o -name '*.spec.*' | head -20
3. How are tests structured? (describe blocks? test classes? flat?)
4. What mocking approach is used? (jest.mock? dependency injection? factories? sinon?)
5. What fixture/setup patterns are used? (beforeEach? factories? builders?)
6. Are there integration tests vs unit tests? How are they separated?
7. Read 3-5 existing test files and extract the exact patterns used.
Report with specific examples from actual test files including file paths.")
```

## Template

```markdown
---
paths:
  {{discovered test file patterns — match actual naming:}}
  {{- "**/*.test.*"}}
  {{- "**/*.spec.*"}}
  {{- "**/__tests__/**"}}
  {{- "**/test/**"}}
---

# Testing Rules

## Framework

**Framework**: {{discovered — e.g. "Vitest", "Jest", "pytest", "go test"}}
**Command**: `{{discovered test command}}`
**Config**: `{{discovered config file — e.g. vitest.config.ts, jest.config.js}}`

## Conventions

{{discovered — from actual test files:
- File naming pattern (e.g. "*.test.ts co-located with source")
- Test structure (e.g. "describe() blocks per function, it() for each case")
- Assertion style (e.g. "expect().toBe(), not assert()")}}

## Mocking

{{discovered — what mocking approach is used:
- Library (e.g. "vi.mock(), jest.mock()")
- Dependency injection pattern if present
- Factory/builder patterns if used}}

## Setup / Teardown

{{discovered — what setup patterns are used:
- beforeEach/afterEach usage
- Test fixtures location
- Database/service setup for integration tests}}

## What to Test

{{discovered — what the project actually tests.
Look at existing test coverage to determine the testing philosophy.}}

## What NOT to Test

{{discovered — patterns the project explicitly avoids.
If none observed: "No explicit exclusions found — test at your judgement."}}
```

## Rules

- The frontmatter `paths:` block MUST match actual test file naming in this project.
- All conventions must come from reading actual test files — not invented examples.
- If no test framework is detected when reading the project manifest, write "No test framework detected. Set up tests before adding this rule."
- If `.claude/rules/testing.md` already exists, read it first and MERGE.
