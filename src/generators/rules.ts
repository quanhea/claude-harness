import type { ProjectAnalysis } from '../analyzers/project.js'
import type { GeneratedFile } from '../types.js'

export function generateRules(analysis: ProjectAnalysis): GeneratedFile[] {
  const files: GeneratedFile[] = []

  files.push({
    path: '.claude/rules/architecture.md',
    content: generateArchitectureRule(analysis),
    preserveExisting: true,
  })

  files.push({
    path: '.claude/rules/testing.md',
    content: generateTestingRule(analysis),
    preserveExisting: true,
  })

  files.push({
    path: '.claude/rules/documentation.md',
    content: generateDocumentationRule(),
    preserveExisting: true,
  })

  return files
}

function generateArchitectureRule(analysis: ProjectAnalysis): string {
  const langSpecific = getLanguageSpecificRules(analysis)

  return `---
description: Architecture enforcement rules — loaded on every session
---

# Architecture Rules

## Dependency Direction

Dependencies MUST flow in one direction within each domain:
Types → Config → Repository → Service → Runtime → UI

Never:
- Import UI from Service/Repository layers
- Create circular dependencies between domains
- Use implicit globals — pass dependencies explicitly

## Boundaries

- Parse and validate ALL external data at system boundaries
- Internal code trusts already-validated data — no redundant checks
- Cross-domain communication goes through explicit public APIs
- Cross-cutting concerns (auth, logging, metrics) use provider interfaces

## File Organization

- One concept per file, max ~300 lines
- Co-locate tests: \`foo.ts\` → \`foo.test.ts\`
- Index files export public API only — no logic
${langSpecific}

## When Adding New Code

1. Check \`docs/ARCHITECTURE.md\` for which domain/layer this belongs to
2. Follow existing patterns in that domain
3. If creating a new domain, update \`docs/ARCHITECTURE.md\`
4. If changing boundaries, update this rule file and architecture docs
`
}

function generateTestingRule(analysis: ProjectAnalysis): string {
  const testCmd = analysis.testCommand || 'the project test command'
  const testFw = analysis.testFramework || 'the project test framework'

  // Path-scoped: only loaded when editing test files
  return `---
paths:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/__tests__/**"
  - "**/test/**"
  - "**/tests/**"
description: Testing conventions — loaded when editing test files
---

# Testing Rules

## Test Framework

Use \`${testFw}\`. Run tests with: \`${testCmd}\`

## Conventions

- Test files live next to source: \`foo.ts\` → \`foo.test.ts\`
- Each test file tests one module
- Use descriptive test names that explain the behavior, not the implementation
- Group related tests with describe blocks

## What to Test

- Public API of each module
- Edge cases and error paths
- Integration points (API boundaries, database queries)
- Business logic — especially conditional behavior

## What NOT to Test

- Private implementation details
- Framework internals
- Simple getters/setters with no logic
- Type-only code

## Test Quality

- Tests should be independent — no shared mutable state
- Tests should be fast — mock external services, not internal code
- Each test should have a single assertion focus
- Prefer real implementations over mocks for internal dependencies
`
}

function generateDocumentationRule(): string {
  return `---
description: Documentation maintenance rules
---

# Documentation Rules

## System of Record

The \`docs/\` directory is the system of record. If knowledge isn't in the repo, it doesn't exist for agents.

## When to Update Docs

- **New domain/module**: Update \`docs/ARCHITECTURE.md\`
- **New pattern/convention**: Add to relevant architecture docs
- **Design decision**: Create or update a design doc in \`docs/design-docs/\`
- **API change**: Update relevant product specs
- **Quality change**: Will be reflected in \`docs/QUALITY.md\` by quality scans

## Documentation Quality

- Be specific and mechanical — agents can't interpret vague prose
- Use examples, not abstract descriptions
- Link to source files when referencing code
- Keep docs under 200 lines — split large docs into focused sub-documents
- Remove stale information rather than marking it as outdated

## Progressive Disclosure

- CLAUDE.md is the table of contents (~100 lines)
- Architecture docs provide the structural map
- Design docs go deep on specific decisions
- Don't duplicate — link to the source of truth
`
}

function getLanguageSpecificRules(analysis: ProjectAnalysis): string {
  const rules: string[] = []

  if (analysis.languages.includes('typescript') || analysis.languages.includes('javascript')) {
    rules.push(`
## TypeScript/JavaScript

- Prefer \`const\` over \`let\`, never \`var\`
- Use strict TypeScript — no \`any\` unless truly necessary
- Parse external data with a schema validator (Zod, etc.) at boundaries
- Prefer named exports over default exports`)
  }

  if (analysis.languages.includes('python')) {
    rules.push(`
## Python

- Use type hints on all public functions
- Use Pydantic or dataclasses for data shapes
- Validate external input at boundaries with schema validation`)
  }

  if (analysis.languages.includes('go')) {
    rules.push(`
## Go

- Handle all errors explicitly — no blank \`_\` for error returns
- Use interfaces for dependency injection
- Keep packages focused — one responsibility per package`)
  }

  if (analysis.languages.includes('rust')) {
    rules.push(`
## Rust

- Prefer Result over panic for recoverable errors
- Use strong types for domain concepts (newtypes)
- Derive traits where possible`)
  }

  return rules.join('\n')
}
