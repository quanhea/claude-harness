# Template: Structural Tests

> Article: "constraints enforced mechanically via custom linters AND structural tests"
> Structural tests are REAL test files that validate architecture constraints.
> They must match the project's actual test framework and conventions.
> NEVER hardcode test code — generate it based on discovered architecture + test patterns.

---

## How to Generate

### Step 1: Discover test conventions

**Launch an Explore agent:**

```
Agent(subagent_type: "Explore", prompt: "Find the testing setup for this project:
1. What test framework? (vitest, jest, mocha, pytest, go test, cargo test, etc.)
2. What's the test file naming convention? (*.test.ts, *_test.py, *_test.go, etc.)
3. Where do tests live? (co-located? tests/ dir? __tests__/ dir?)
4. What assertion style? (expect, assert, should, etc.)
5. What import style do tests use?
6. Read 2-3 existing test files to understand the exact style.
Report with full examples from actual test files.")
```

### Step 2: Discover architecture to test

Read `ARCHITECTURE.md` (which was generated in Step 3). Extract:
- The layer structure and allowed dependency direction
- The domain/module boundaries
- File organization rules (max file size, etc.)

### Step 3: Generate the structural test file

Write a test file that:
1. **Uses the project's actual test framework and conventions** (from Step 1)
2. **Tests the actual architecture rules** (from Step 2)
3. **Lives in the project's test directory** (matching existing conventions)

The test should validate:
- **Layer dependency direction**: Walk the import graph and assert no backward imports
  (the layers and direction come from ARCHITECTURE.md, not hardcoded)
- **No circular dependencies**: Between domains/modules
- **File size limits**: If ARCHITECTURE.md specifies a max, assert it

### For GREENFIELD projects:

**Launch a research agent:**

```
Agent(subagent_type: "general-purpose", prompt: "Search for examples of architecture
tests / structural tests in {{language}} {{framework}} projects as of {{year}}.
Find:
1. How to walk the import/dependency graph programmatically in {{language}}
2. Examples of tests that enforce layer boundaries
3. Libraries that help with architecture testing (e.g., dependency-cruiser for JS,
   import-linter for Python, etc.)
Search for '{{language}} architecture test dependency enforcement {{year}}'")
```

Generate based on research findings.

---

## Output

Write one test file in the project's test directory, matching the project's:
- Test framework
- File naming convention
- Import style
- Assertion style
- Directory structure

## Adaptation Instructions

1. The test file must look like it belongs in the project — same style as existing tests
2. Layer names and dependency rules come from ARCHITECTURE.md, NEVER hardcoded
3. If the project has no clear layers, test only for circular deps and file size
4. If architecture tests already exist, do NOT overwrite — merge patterns
5. The test runs with the project's normal test command (no extra setup)
