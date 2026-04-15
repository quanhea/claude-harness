---
description: Generate architecture test file
---

# Task: Generate architecture structural tests

**Output:** `{{PROJECT_DIR}}/tests/architecture.test.*` (or matching test directory convention)

You are generating structural tests that enforce architecture constraints from ARCHITECTURE.md using the project's actual test framework. These are real test files that run with the normal test command.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Launch Explore agent to discover test framework, file naming, directory structure, and assertion style"
3. "Read ARCHITECTURE.md for layer structure, dependency direction, and invariants"
4. "Read 2-3 existing test files to understand the exact test style"
5. "Check if architecture tests already exist (do not overwrite)"
6. "Write architecture test file matching project conventions exactly"
7. "Verify test file runs with the project's normal test command"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Explore Agent Prompt (Task 2)

```
Agent(subagent_type: "Explore", prompt: "Find the testing setup for this project:
1. What test framework? (vitest, jest, mocha, pytest, go test, cargo test, etc.)
2. What's the test file naming convention? (*.test.ts, *_test.py, *_test.go, etc.)
3. Where do tests live? (co-located? tests/ dir? __tests__/ dir?)
4. What assertion style? (expect(), assert, should, t.Error())
5. What import style do tests use? (CommonJS require? ES imports? relative vs absolute?)
6. Read 2-3 existing test files to understand the exact style.
Report with full examples from actual test files including file paths.")
```

## What to Test

Read ARCHITECTURE.md and extract:
1. **Layer dependency direction** — e.g. "services may not import from controllers"
2. **Circular dependencies** — no module should circularly depend on another
3. **File size limits** — if documented in ARCHITECTURE.md invariants

## Test File Structure

The test file must look like it belongs in the project — same framework, same style. Examples:

### TypeScript (Vitest)

```typescript
import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'

describe('Architecture', () => {
  it('enforces dependency direction — {{discovered rule}}', () => {
    // Read source files and check imports
    // Layer names and rules come from ARCHITECTURE.md
    {{discovered check}}
  })

  it('has no circular dependencies', () => {
    // Use madge or ts-morph to detect cycles
    {{discovered check}}
  })
})
```

### Python (pytest)

```python
import pytest
import ast
import os
from pathlib import Path

def test_dependency_direction():
    """{{discovered layer rule from ARCHITECTURE.md}}"""
    {{discovered check}}

def test_no_circular_imports():
    {{discovered check}}
```

### Go

```go
package architecture_test

import (
    "go/parser"
    "go/token"
    "testing"
    "{{module-path}}"
)

func TestDependencyDirection(t *testing.T) {
    // {{discovered rule from ARCHITECTURE.md}}
    {{discovered check}}
}
```

## Rules

- The test file MUST match the project's test framework, naming, and assertion style exactly.
- Layer names and dependency rules come from ARCHITECTURE.md — never hardcoded.
- If no clear layers exist, test only for circular dependencies.
- If architecture tests already exist, do NOT overwrite — read and merge patterns.
- The test must run with the project's normal test command — no additional setup.
- If the architecture cannot be tested programmatically in this language, write a "smoke test" that at least checks for required harness files.
