---
name: harness-gc
description: Garbage collection — scan for code drift, stale patterns, and quality decay. Opens targeted fixes. Article says "on a regular cadence, we have background tasks that scan for deviations, update quality grades, and open targeted refactoring". Use when wanting to clean up, or run periodically.
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, Agent
---

# Harness Garbage Collection

Run a comprehensive codebase scan for drift, staleness, and quality decay.
Fix what can be fixed automatically. Report what needs human judgment.

Article: "We started encoding 'golden principles' directly into the repository
and built a recurring cleanup process... On a regular cadence, we have a set of
background tasks that scan for deviations, update quality grades, and open
targeted refactoring pull requests."

## Context

- Source file count: !`find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.rs" -o -name "*.go" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" 2>/dev/null | wc -l | tr -d ' '`
- Recent changes: !`git log --oneline -20 2>/dev/null || echo "no git"`
- Knowledge base health: !`${CLAUDE_PLUGIN_ROOT}/scripts/validate-docs.sh . 2>&1 || true`
- Quality metrics: !`${CLAUDE_PLUGIN_ROOT}/scripts/grade-quality.sh . 2>&1 | head -30 || true`

## Scan Checklist

### 1. Oversized Files
Find source files over 300 lines. For each, determine if it can be split:
```bash
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" \) \
  -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.git/*" \
  -not -name "*.test.*" -not -name "*.spec.*" \
  -exec sh -c 'test $(wc -l < "$1") -gt 300 && echo "$(wc -l < "$1") $1"' _ {} \; | sort -rn
```

### 2. Unstructured Logging
Find files using console.log/print instead of structured logging.

### 3. Boundary Violations
Find files with `JSON.parse`, `json.loads`, or equivalent without schema validation.

### 4. Architecture Drift
Delegate to `@architect` to check actual vs documented architecture.

### 5. Stale Documentation
Delegate to `@gardener` to find stale docs and broken references.

### 6. Dead Code
Look for:
- Exported functions/types never imported elsewhere
- Files not imported by anything
- Unused dependencies in package manifest

### 7. Duplicated Patterns
Find hand-rolled helpers that could be shared utilities.
Article: "we prefer shared utility packages over hand-rolled helpers to keep invariants centralized"

### 8. Missing Tests
Find source files with no corresponding test file.

## Actions

For each issue found:

1. **Auto-fix** if straightforward (< 5 min):
   - Split oversized files
   - Replace console.log with structured logger
   - Add missing schema validation
   - Remove dead imports

2. **Create tech debt item** if complex:
   - Add to `docs/exec-plans/tech-debt-tracker.md`
   - Include severity, domain, and impact

3. **Update quality grades**:
   - Run quality assessment
   - Update `docs/QUALITY.md`

### 9. Promote Doc Rules to Code

Article: "When documentation falls short, we promote the rule into code."

Check if any documented rule (in `.claude/rules/` or `docs/`) is being repeatedly violated:
- If the same type of violation appears 3+ times across different files
- And there's a doc rule but no linter/test that catches it automatically
- Then flag it as **"candidate for promotion to code"**
- Suggest: add a lint script, structural test, or PostToolUse hook to enforce it mechanically

### 10. Check PR Review Feedback for Patterns

Scan recent merged PRs for review comments that indicate repeated issues:
```bash
gh pr list --state merged --limit 10 --json number,title | head -20
```
For each, check if review comments mention the same type of issue. If a pattern emerges,
suggest encoding it as a rule or linter.

## Output

Report:
- Issues found per category
- Auto-fixes applied
- New tech debt items created
- Updated quality grades
- Doc rules that should be promoted to code (with justification)
- PR review patterns that should become rules
- Remaining items needing human judgment
