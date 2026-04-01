---
name: harness-review
description: Architecture-aware code review for current changes. Use when reviewing PRs, checking code before committing, or validating changes against architecture rules. Also use when user says "review my changes", "check the code", or "architecture review".
allowed-tools: Read, Glob, Grep, Bash
argument-hint: [file, branch, or PR to review]
---

# Harness Review

Perform an architecture-aware code review following the Harness Engineering principles.

## What to Review

If an argument is given, review that: $ARGUMENTS
Otherwise, review the current changes:

- Staged changes: !`git diff --cached --stat 2>/dev/null || echo "nothing staged"`
- Unstaged changes: !`git diff --stat 2>/dev/null || echo "no changes"`
- Untracked files: !`git ls-files --others --exclude-standard 2>/dev/null | head -20`

## Architecture Context

Read `docs/ARCHITECTURE.md` to understand module boundaries and dependency rules.
Read `.claude/rules/architecture.md` for enforced constraints.

## Review Checklist

### 1. Architecture Compliance

- Read `docs/ARCHITECTURE.md` for the intended architecture
- Check that imports respect layer boundaries (Types → Config → Repo → Service → Runtime → UI)
- No circular dependencies between domains
- Cross-cutting concerns use provider interfaces, not direct imports
- New code is in the correct domain/layer

### 2. Boundary Validation

- External data (API responses, user input, file reads, env vars) is parsed/validated at entry
- Internal code trusts already-validated data — no redundant deep checks
- Schema validation at system boundaries (Zod, Pydantic, etc.)

### 3. Test Coverage

- New behavior has corresponding tests
- Tests are co-located with source files
- Edge cases and error paths are covered
- Run tests if a test command is available

### 4. Code Quality

- One concept per file, files under ~300 lines
- Clear naming following project conventions
- No `any` types (TypeScript), proper error handling
- No dead code or unused imports

### 5. Documentation Impact

- If new domain/module: is `docs/ARCHITECTURE.md` updated?
- If changing boundaries: are rules updated?
- If changing public API: are relevant docs updated?

## Output Format

For each finding:
- **🔴 Blocker** — Must fix before merge
- **🟡 Warning** — Should fix, but not blocking
- **🔵 Suggestion** — Nice to have

Each with:
- `file:line` reference
- What's wrong
- How to fix it

End with a verdict: **APPROVE**, **REQUEST CHANGES**, or **NEEDS DISCUSSION**.
