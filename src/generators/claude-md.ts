import type { ProjectAnalysis } from '../analyzers/project.js'
import type { GeneratedFile } from '../types.js'

/**
 * Generate .claude/CLAUDE.md as a TABLE OF CONTENTS — not an encyclopedia.
 * ~100 lines. Points to deeper docs. Progressive disclosure.
 */
export function generateClaudeMd(analysis: ProjectAnalysis): GeneratedFile[] {
  const { name, languages, frameworks, packageManager, testFramework, buildCommand, testCommand, lintCommand, domains, isMonorepo } = analysis

  const langStr = languages.slice(0, 3).join(', ')
  const frameworkStr = frameworks.length > 0 ? frameworks.join(', ') : 'none'

  const buildSection = buildCommand ? `- **Build**: \`${buildCommand}\`` : ''
  const testSection = testCommand ? `- **Test**: \`${testCommand}\`` : ''
  const lintSection = lintCommand ? `- **Lint**: \`${lintCommand}\`` : ''
  const commandSection = [buildSection, testSection, lintSection].filter(Boolean).join('\n')

  const pmRunCmd = packageManager === 'yarn' ? 'yarn' : packageManager === 'pnpm' ? 'pnpm' : packageManager === 'bun' ? 'bun' : 'npm run'

  const domainSection = domains.length > 0
    ? `## Domains\n\n${domains.map(d => `- \`${d}/\``).join('\n')}\n\nSee \`docs/ARCHITECTURE.md\` for dependency rules between domains.`
    : ''

  const monoSection = isMonorepo
    ? `\n## Monorepo\n\nThis is a monorepo. Each package has its own README and may have its own CLAUDE.md.\nSee \`docs/ARCHITECTURE.md\` for package dependency graph.\n`
    : ''

  const content = `# ${name}

> This file is a table of contents. For deep context, follow the pointers below.
> Keep this under 100 lines. Details belong in \`docs/\`.

## Quick Reference

- **Language**: ${langStr}
- **Framework**: ${frameworkStr}
- **Package manager**: ${packageManager}${testFramework ? `\n- **Test framework**: ${testFramework}` : ''}

## Commands

${commandSection || `- Check \`package.json\` scripts or project build files for available commands`}

## Architecture

See \`docs/ARCHITECTURE.md\` for the full architecture map including:
- Module/domain boundaries and dependency rules
- Data flow overview
- Key abstractions and patterns

${domainSection}
${monoSection}
## Knowledge Base

All project knowledge lives in \`docs/\`:

| Path | What's there |
|------|-------------|
| \`docs/ARCHITECTURE.md\` | Architecture map, module boundaries, dependency rules |
| \`docs/QUALITY.md\` | Quality grades per domain |
| \`docs/design-docs/\` | Design documents and decisions |
| \`docs/exec-plans/\` | Execution plans (active + completed) |
| \`docs/product-specs/\` | Product specifications |
| \`docs/references/\` | External reference material |
| \`docs/encyclopedia/\` | Auto-generated codebase encyclopedia |

## Rules

Architecture rules are enforced in \`.claude/rules/\`. Key rules:
- **architecture.md** — Module boundaries, dependency direction, layer constraints
- **testing.md** — Test conventions (loaded when editing test files)
- **documentation.md** — Documentation maintenance rules

## Skills

| Skill | What it does |
|-------|-------------|
| \`/harness-sync\` | Re-analyze project and update docs |
| \`/harness-review\` | Architecture-aware code review |
| \`/harness-plan\` | Create an execution plan for a task |
| \`/harness-quality\` | Grade quality per domain |

## Agents

| Agent | Role |
|-------|------|
| \`@reviewer\` | Code review with architecture awareness |
| \`@architect\` | Architecture analysis and recommendations |
| \`@gardener\` | Find and fix stale docs, dead code, quality issues |

## Principles

1. **Repository is the system of record** — if it's not in the repo, it doesn't exist
2. **Progressive disclosure** — start here, follow pointers to depth
3. **Enforce mechanically** — rules are in code, not prose
4. **Agent legibility** — optimize for Claude's reasoning, not human aesthetics
5. **Correct > clever** — boring, composable, well-tested code wins
`

  return [{
    path: '.claude/CLAUDE.md',
    content,
    preserveExisting: true,
  }]
}
