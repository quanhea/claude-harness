# Template: .claude/skills/ (Project-Embedded Skills)

> Generate these skills in the user's `.claude/skills/` directory.
> These are project-specific skills that live in the repo (not in the plugin).

---

## File: .claude/skills/sync/SKILL.md

```yaml
---
name: sync
description: Re-analyze the project and update documentation to match current code. Use when docs may be stale or after significant code changes.
allowed-tools: Read, Glob, Grep, Write, Edit, Bash
---
```

```markdown
# Sync

Re-analyze this project and update all documentation to reflect the current codebase.

## Context

Current architecture doc:

@ARCHITECTURE.md

Current quality grades:

@docs/QUALITY_SCORE.md

## Steps

1. **Scan the codebase** to find all domains/modules and their actual dependencies
2. **Compare** documented state in `ARCHITECTURE.md` vs actual code
3. **Update** these files if they've drifted:
   - `ARCHITECTURE.md` — module map, dependency graph, entry points
   - `docs/QUALITY_SCORE.md` — re-grade each domain (Architecture, Testing, Docs, Reliability)
   - `.claude/CLAUDE.md` — update if domains or commands changed
4. **Report** what changed and what needs human attention

## Important

- Preserve user-written content (descriptions, decisions, notes)
- Only update structural/factual information that has drifted
- Keep `.claude/CLAUDE.md` under 100 lines
- Grade quality honestly — don't inflate grades
```

---

## File: .claude/skills/review/SKILL.md

```yaml
---
name: review
description: Architecture-aware code review for current changes. Use when reviewing code, checking PRs, or before committing.
allowed-tools: Read, Glob, Grep, Bash
argument-hint: [file or branch to review]
---
```

```markdown
# Review

Perform an architecture-aware code review.

## What to Review

If an argument is given, review that: $ARGUMENTS
Otherwise, review the current unstaged changes: !`git diff`

## Architecture Reference

@ARCHITECTURE.md

## Review Checklist

### 1. Architecture Compliance
- Read `ARCHITECTURE.md` for the project's layer boundaries and dependency rules
- Check that imports respect the documented dependency direction
- No circular dependencies between domains
- Cross-cutting concerns follow the documented pattern

### 2. Boundary Validation
- External data (API responses, user input, file reads) is parsed/validated at entry
- Internal code trusts validated data — no redundant deep checks

### 3. Test Coverage
- New behavior has tests
- Run tests: `{{test-command}}`

### 4. Documentation
- New domains/modules are reflected in `ARCHITECTURE.md`
- Public APIs have clear interfaces

## Output

For each finding:
- 🔴 **Blocker** / 🟡 **Warning** / 🔵 **Suggestion**
- File:line reference
- What's wrong and how to fix it

End with: **APPROVE**, **REQUEST CHANGES**, or **NEEDS DISCUSSION**.
```

---

## File: .claude/skills/plan/SKILL.md

```yaml
---
name: plan
description: Create a structured execution plan for a task. Use when starting complex work that needs decomposition.
allowed-tools: Read, Glob, Grep, Write
argument-hint: <description of the task>
---
```

```markdown
# Plan

Create a structured execution plan for: $ARGUMENTS

## Context

@ARCHITECTURE.md
@docs/QUALITY_SCORE.md

Check `docs/exec-plans/active/` for related active plans.

## Output

Create a new file at `docs/exec-plans/active/{{slug}}.md`:

```markdown
# Plan: {{title}}

**Status**: 🟡 Active
**Created**: {{date}}

## Goal

{{1-2 sentences on what this achieves}}

## Context

{{what exists today and why this change is needed}}

## Steps

- [ ] Step 1: {{specific action}}
  - Files: {{which files to create/modify}}
  - Validates: {{how to verify this step}}
- [ ] Step 2: ...

## Dependencies

{{what must be true before starting}}

## Validation

{{how to verify the whole plan is done correctly}}

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
```

## Important

- Steps should be small enough for a single PR each
- Each step should be independently verifiable
- Link to relevant architecture docs
```

---

## File: .claude/skills/quality/SKILL.md

```yaml
---
name: quality
description: Grade code quality per domain and update QUALITY_SCORE.md. Use for quality assessment or after major changes.
allowed-tools: Read, Glob, Grep, Bash, Write, Edit
---
```

```markdown
# Quality

Scan the codebase and grade each domain's quality.

## Current Grades

@docs/QUALITY_SCORE.md

## Architecture Reference

@ARCHITECTURE.md

## Grading Criteria

### Architecture (A-F)
- A: Clean boundaries, no violations, dependency direction enforced
- C: Some circular deps or layer violations
- F: No discernible architecture

### Testing (A-F)
- A: Comprehensive coverage, edge cases tested
- C: Happy path only
- F: No tests

### Documentation (A-F)
- A: Architecture docs match reality, public APIs documented
- C: Partial documentation
- F: No documentation

### Reliability (A-F)
- A: Proper error handling, validated boundaries, observable
- C: Basic error handling
- F: No error handling, silent failures

## Process

For each domain in `ARCHITECTURE.md`:
1. Scan source files for architecture compliance
2. Check test files exist and cover key paths
3. Verify documentation exists and is current
4. Review error handling patterns

## Output

Update `docs/QUALITY_SCORE.md` with new grades and notes.
List the top 3 most impactful improvements for each domain.
```

---

## File: .claude/skills/ci-check/SKILL.md

```yaml
---
name: ci-check
description: Check CI status for recent runs, diagnose failures, and suggest or apply fixes. Use after pushing or when CI fails.
allowed-tools: Bash, Read, Grep, Edit
---
```

```markdown
# CI Check

Check CI status and auto-investigate any failures.

## Steps

1. **Check recent CI runs:**
   ```bash
   gh run list --limit 5 --json status,conclusion,name,headBranch,databaseId
   ```

2. **If any failed**, get the failure logs:
   ```bash
   gh run view <run-id> --log-failed 2>&1 | tail -100
   ```

3. **Diagnose the failure:**
   - Read the failing test or build step output
   - Identify the root cause (test failure, lint error, build error, flaky test)
   - Read the relevant source files

4. **Apply fix or report:**
   - If it's a test failure: fix the test or source code
   - If it's a lint error: run the formatter/linter
   - If it's a flaky test: note it for follow-up, don't block
   - If it's a build error: read the build config and fix

5. **Re-push if fixed:**
   ```bash
   git add <fixed-files>
   git commit -m "[c] Fix CI failure: <description>"
   git push
   ```
```

---

## Adaptation Instructions

1. Replace `{{test-command}}` with the project's actual test command
2. The `!` backtick syntax in the review skill injects live git context before Claude sees it
3. If `.claude/skills/` already exists, don't overwrite — only add missing skills
4. The ci-check skill requires `gh` CLI to be installed and authenticated
