import type { ProjectAnalysis } from '../analyzers/project.js'
import type { GeneratedFile } from '../types.js'

export function generateSkills(analysis: ProjectAnalysis): GeneratedFile[] {
  return [
    {
      path: '.claude/skills/harness-sync/SKILL.md',
      content: generateSyncSkill(analysis),
      preserveExisting: true,
    },
    {
      path: '.claude/skills/harness-review/SKILL.md',
      content: generateReviewSkill(analysis),
      preserveExisting: true,
    },
    {
      path: '.claude/skills/harness-plan/SKILL.md',
      content: generatePlanSkill(analysis),
      preserveExisting: true,
    },
    {
      path: '.claude/skills/harness-quality/SKILL.md',
      content: generateQualitySkill(analysis),
      preserveExisting: true,
    },
  ]
}

function generateSyncSkill(analysis: ProjectAnalysis): string {
  return `---
name: harness-sync
description: Re-analyze the project and update documentation to match current code
allowed-tools: Read, Glob, Grep, Write, Edit, Bash
---

# Harness Sync

Re-analyze this project and update all harness documentation to reflect the current state of the codebase.

## Steps

1. Read \`docs/ARCHITECTURE.md\` to understand the current documented architecture
2. Scan the codebase to find:
   - All domains/modules and their actual dependencies
   - Entry points and key abstractions
   - Test coverage status
3. Compare documented state vs actual state
4. Update these files if they've drifted:
   - \`docs/ARCHITECTURE.md\` — module map, dependency graph
   - \`docs/QUALITY.md\` — re-grade each domain
   - \`.claude/CLAUDE.md\` — update if domains changed
5. Report what changed

## Important

- Preserve user-written content (descriptions, decisions, notes)
- Only update structural/factual information that has drifted
- If a domain was added or removed, update all relevant docs
- Keep \`.claude/CLAUDE.md\` under 100 lines
`
}

function generateReviewSkill(analysis: ProjectAnalysis): string {
  const testCmd = analysis.testCommand || '# check project for test command'

  return `---
name: harness-review
description: Architecture-aware code review for current changes
allowed-tools: Read, Glob, Grep, Bash
argument-hint: [file or branch to review]
---

# Harness Review

Perform an architecture-aware code review.

## What to Review

If an argument is given, review that file or branch diff: $ARGUMENTS
Otherwise, review the current unstaged changes (\`git diff\`).

## Review Checklist

### 1. Architecture Compliance
- Read \`docs/ARCHITECTURE.md\` for dependency rules
- Check that imports respect layer boundaries (Types → Config → Repo → Service → Runtime → UI)
- No circular dependencies between domains
- Cross-cutting concerns use provider interfaces

### 2. Boundary Validation
- External data (API responses, user input, file reads) is parsed/validated at entry
- Internal code trusts validated data — no redundant deep checks

### 3. Test Coverage
- New behavior has tests
- Tests follow conventions in \`.claude/rules/testing.md\`
- Run tests: \`${testCmd}\`

### 4. Documentation
- New domains/modules are reflected in \`docs/ARCHITECTURE.md\`
- Public APIs have clear interfaces
- Non-obvious logic has inline comments

## Output

For each finding:
- 🔴 **Blocker** / 🟡 **Warning** / 🔵 **Suggestion**
- File:line reference
- What's wrong and how to fix it

End with a summary: APPROVE, REQUEST CHANGES, or NEEDS DISCUSSION.
`
}

function generatePlanSkill(analysis: ProjectAnalysis): string {
  return `---
name: harness-plan
description: Create a structured execution plan for a task
allowed-tools: Read, Glob, Grep, Write
argument-hint: <description of the task to plan>
---

# Harness Plan

Create a structured execution plan for: $ARGUMENTS

## Process

1. Read \`docs/ARCHITECTURE.md\` to understand current architecture
2. Read \`docs/QUALITY.md\` for known quality gaps
3. Check \`docs/exec-plans/active/\` for related active plans
4. Analyze the task and break it into steps

## Plan Structure

Create a new file at \`docs/exec-plans/active/<slug>.md\` with this structure:

\`\`\`markdown
# Plan: <title>

**Status**: 🟡 Active
**Created**: <date>
**Owner**: <who requested this>

## Goal

<1-2 sentences on what this achieves>

## Context

<What exists today and why this change is needed>

## Steps

- [ ] Step 1: <specific action>
  - Files: <which files to create/modify>
  - Risk: <what could go wrong>
- [ ] Step 2: ...

## Dependencies

<What must be true before starting>

## Validation

<How to verify this is done correctly>

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
\`\`\`

## Important

- Steps should be small enough for a single PR each
- Each step should be independently verifiable
- Link to relevant architecture docs
- Consider impact on existing domains
`
}

function generateQualitySkill(analysis: ProjectAnalysis): string {
  const testCmd = analysis.testCommand || '# check project for test command'

  return `---
name: harness-quality
description: Grade code quality per domain and update QUALITY.md
allowed-tools: Read, Glob, Grep, Bash, Write, Edit
---

# Harness Quality

Scan the codebase and grade each domain's quality. Update \`docs/QUALITY.md\`.

## Grading Criteria

### Architecture (A-F)
- A: Clean boundaries, no violations, dependency direction enforced
- B: Minor boundary issues, mostly clean
- C: Some circular deps or layer violations
- D: Significant architectural problems
- F: No discernible architecture

### Testing (A-F)
- A: Comprehensive coverage, good edge case testing
- B: Core paths tested, some gaps
- C: Happy path only
- D: Minimal tests
- F: No tests

### Documentation (A-F)
- A: Architecture docs match reality, public APIs documented
- B: Mostly documented, minor gaps
- C: Partial documentation
- D: Minimal docs
- F: No documentation

### Reliability (A-F)
- A: Proper error handling, validated boundaries, observable
- B: Good error handling, some gaps
- C: Basic error handling
- D: Minimal error handling, silent failures likely
- F: No error handling

## Process

1. For each domain in \`docs/ARCHITECTURE.md\`:
   a. Scan source files for architecture compliance
   b. Check test coverage: \`${testCmd}\`
   c. Verify documentation exists and is current
   d. Review error handling patterns
2. Update \`docs/QUALITY.md\` with new grades
3. List top 3 improvements per domain

## Output

Update \`docs/QUALITY.md\` with current grades and notes.
Report a summary of the most impactful improvements to make.
`
}
