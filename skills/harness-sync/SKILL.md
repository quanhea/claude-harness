---
name: harness-sync
description: Re-analyze the project and update harness documentation to match the current codebase. Use when docs might be stale, after significant code changes, or periodically for maintenance. Also use when the user says "sync docs", "update architecture", or "refresh harness".
allowed-tools: Read, Glob, Grep, Write, Edit, Bash
---

# Harness Sync

Re-analyze this project and update all harness documentation to reflect the current codebase.

## Current State

- Source files: !`find . -maxdepth 4 -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.rs" -o -name "*.go" -o -name "*.java" -o -name "*.rb" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*" 2>/dev/null | wc -l | tr -d ' '` source files
- Top directories: !`find . -maxdepth 2 -type d -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" 2>/dev/null | head -20`
- Recent git changes: !`git log --oneline -10 2>/dev/null || echo "not a git repo"`

## Process

### 1. Read Current Docs

Read these files to understand what's currently documented:
- `.claude/CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `docs/QUALITY.md`

### 2. Scan Codebase

Scan the actual codebase to find:
- All domains/modules and their real dependencies (check import/require statements)
- Entry points
- New files or directories not reflected in docs
- Removed files or directories still mentioned in docs

### 3. Compare and Update

For each doc, compare documented state vs actual state:

**docs/ARCHITECTURE.md**:
- Are all listed domains still present?
- Are there new domains not listed?
- Do the dependency rules still hold?
- Are entry points current?

**docs/QUALITY.md**:
- Are all domains listed?
- Do grades need updating based on visible changes?

**.claude/CLAUDE.md**:
- Are build/test/lint commands still correct?
- Are listed domains current?
- Is it still under 100 lines?

### 4. Apply Updates

Update only what has drifted. Preserve user-written content (descriptions, decisions, notes). Only change structural/factual information.

### 5. Report

List what was updated, what was already current, and what needs human attention.
