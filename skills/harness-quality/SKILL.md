---
name: harness-quality
description: Grade code quality per domain and update QUALITY.md. Use for quality assessment, after major changes, or when the user asks about code quality, technical debt, or domain health.
allowed-tools: Read, Glob, Grep, Bash, Write, Edit
---

# Harness Quality

Scan the codebase and grade each domain's quality. Update `docs/QUALITY.md`.

## Current State

- Current quality grades: read `docs/QUALITY.md`
- Architecture reference: read `docs/ARCHITECTURE.md`
- Source files: !`find . -maxdepth 4 -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.rs" -o -name "*.go" -o -name "*.java" -o -name "*.rb" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" 2>/dev/null | wc -l | tr -d ' '` source files
- Test files: !`find . -maxdepth 4 -type f \( -name "*.test.*" -o -name "*.spec.*" -o -name "*_test.*" \) -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | wc -l | tr -d ' '` test files

## Grading Criteria

### Architecture (A-F)
- **A**: Clean boundaries, no dependency violations, direction enforced, cross-cutting via providers
- **B**: Minor boundary issues, mostly clean separation
- **C**: Some circular deps or layer violations, unclear boundaries
- **D**: Significant architectural problems, tangled dependencies
- **F**: No discernible architecture, everything imports everything

### Testing (A-F)
- **A**: Comprehensive coverage, edge cases, error paths, integration tests
- **B**: Core paths tested, some gaps in edge cases
- **C**: Happy path only, minimal error path testing
- **D**: Minimal tests, major gaps
- **F**: No tests

### Documentation (A-F)
- **A**: Architecture docs match reality, public APIs documented, design decisions recorded
- **B**: Mostly documented, minor gaps or slightly stale
- **C**: Partial documentation, some domains undocumented
- **D**: Minimal docs, mostly outdated
- **F**: No documentation

### Reliability (A-F)
- **A**: Proper error handling, validated boundaries, observable (logging/metrics), graceful degradation
- **B**: Good error handling, some gaps in observability
- **C**: Basic error handling, limited observability
- **D**: Minimal error handling, silent failures likely
- **F**: No error handling, crashes on unexpected input

## Process

For each domain listed in `docs/ARCHITECTURE.md`:

1. **Architecture**: Scan import statements for boundary violations and circular deps
2. **Testing**: Count test files vs source files, check for test coverage of key paths
3. **Documentation**: Check if the domain is documented in ARCHITECTURE.md, has README or inline docs
4. **Reliability**: Scan for error handling patterns (try/catch, Result types, error returns)

## Output

Update `docs/QUALITY.md` with:
- New grades for each domain
- Specific notes explaining each grade
- Top 3 most impactful improvements per domain

Add new entries to the Technical Debt Tracker for significant issues found.
