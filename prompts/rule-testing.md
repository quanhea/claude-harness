---
description: Generate .claude/rules/testing.md
outputs: [".claude/rules/testing.md"]
---

# Task: Generate .claude/rules/testing.md

**Output:** `{{PROJECT_DIR}}/.claude/rules/testing.md`

You are generating the testing rule file — path-scoped to load only when editing test files. It must describe the actual test conventions found in this codebase.

This file is the *mechanical* half of the project's testing guidance: frameworks, file naming, directory layout, commands. The *policy* half — red-green-refactor, what may be mocked, what coverage must hold — lives in `docs/TDD-RULES.md`, written by the `tdd-rules` task. Keep the split clean: state conventions here, doctrine there, and open this file by deferring to that one so a reader who lands here first still meets the rules that outrank these.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent). If the root has no manifest but its immediate subdirectories do, this is an umbrella repo: detect each sub-project separately and treat the root as the cross-cutting layer"
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
7. Is this a browser client (SPA/SSR)? If so, how does it configure the dev server port? Is there E2E/browser testing (Playwright, Puppeteer, Cypress)?
8. Read 3-5 existing test files and extract the exact patterns used.
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

> Read `docs/TDD-RULES.md` first — it is non-negotiable and governs everything
> below. That document defines *how* we test (red-green-refactor, no production
> code without a failing test, real internal services, assert through public
> interfaces, inject non-determinism, tests as executable specification). This
> file documents the mechanical conventions that implement those rules here.
> If the two ever disagree, `docs/TDD-RULES.md` wins.

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

## Browser / E2E Testing

{{If this project has a browser client (SPA, SSR, or any frontend that runs in a browser):
- Read the dev server port from the project's config (`.env`, `.env.local`, framework config) — never hardcode a port number.
- Use browser MCP tools (Playwright, Puppeteer) for E2E tests that need a running browser.
- If the project uses worktree isolation, each worktree gets its own `PORT` in `.env.local` — tests must read it from there so they work in any worktree without modification.
If this is a backend-only project with no browser client, omit this section entirely.}}
```

## Rules

- The frontmatter `paths:` block MUST match actual test file naming in this project.
- All conventions must come from reading actual test files — not invented examples.
- If no test framework is detected when reading the project manifest, write "No test framework detected. Set up tests before adding this rule."
- If `.claude/rules/testing.md` already exists, read it first and MERGE.
