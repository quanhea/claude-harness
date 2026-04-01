import type { ProjectAnalysis } from '../analyzers/project.js'
import type { GeneratedFile } from '../types.js'

export function generateArchitecture(analysis: ProjectAnalysis): GeneratedFile[] {
  const { name, languages, frameworks, domains, entryPoints, isMonorepo, packageManager } = analysis

  const langStr = languages.slice(0, 3).join(', ')
  const frameworkStr = frameworks.length > 0 ? frameworks.join(', ') : 'none detected'

  const entrySection = entryPoints.length > 0
    ? `## Entry Points\n\n${entryPoints.map(e => `- \`${e}\``).join('\n')}`
    : ''

  const domainSection = domains.length > 0
    ? generateDomainSection(domains)
    : `## Domains\n\n_No clear domain boundaries detected. As the project grows, organize code into domains and document their boundaries here._`

  const layerSection = generateLayerSection(analysis)

  const content = `# Architecture

> Architecture map for ${name}. This is the source of truth for module boundaries,
> dependency rules, and structural constraints. Keep this up to date.

## Overview

- **Language**: ${langStr}
- **Framework**: ${frameworkStr}
- **Package manager**: ${packageManager}
${isMonorepo ? '- **Structure**: Monorepo\n' : ''}

${entrySection}

${domainSection}

${layerSection}

## Dependency Rules

Dependencies flow in one direction. Within each domain:

\`\`\`
Types → Config → Repository → Service → Runtime → UI
\`\`\`

Cross-cutting concerns (auth, logging, metrics, feature flags) enter through
explicit provider interfaces, never direct imports.

### What's allowed

- A module may depend on modules to its LEFT in the chain above
- A module may depend on shared \`types/\` and \`utils/\`
- Cross-domain dependencies go through explicit interfaces

### What's NOT allowed

- Circular dependencies between domains
- UI importing directly from Repository layer
- Service layer depending on UI components
- Implicit globals or singletons (use dependency injection)

## Conventions

### File Organization

- One concept per file. If a file grows beyond ~300 lines, split it.
- Co-locate tests next to source: \`foo.ts\` → \`foo.test.ts\`
- Index files re-export public API only. No logic in index files.

### Naming

- Files: kebab-case (\`user-service.ts\`)
- Types/Classes: PascalCase (\`UserService\`)
- Functions/variables: camelCase (\`getUser\`)
- Constants: UPPER_SNAKE_CASE (\`MAX_RETRIES\`)

### Error Handling

- Parse/validate at boundaries (API inputs, external data)
- Use typed errors, not string messages
- Let internal code trust validated data — no redundant checks

## Diagrams

_Add architecture diagrams here as the project evolves. Use Mermaid or ASCII art._
`

  return [{
    path: 'docs/ARCHITECTURE.md',
    content,
    preserveExisting: true,
  }]
}

function generateDomainSection(domains: string[]): string {
  const domainList = domains.map(d => `- **\`${d}/\`** — _TODO: describe this domain's responsibility_`).join('\n')

  return `## Domains

${domainList}

Each domain owns its types, services, and tests. Cross-domain imports must go through
the domain's public API (index file).`
}

function generateLayerSection(analysis: ProjectAnalysis): string {
  if (analysis.frameworks.includes('next') || analysis.frameworks.includes('react') || analysis.frameworks.includes('vue') || analysis.frameworks.includes('angular') || analysis.frameworks.includes('svelte')) {
    return `## Layers

| Layer | Responsibility | Example |
|-------|---------------|---------|
| Types | Data shapes, interfaces, enums | \`types/user.ts\` |
| Config | Environment, feature flags | \`config/app.ts\` |
| Repository | Data access, API clients | \`repo/user-repo.ts\` |
| Service | Business logic, orchestration | \`service/auth-service.ts\` |
| Runtime | Server setup, middleware, providers | \`runtime/server.ts\` |
| UI | Components, pages, layouts | \`components/\`, \`pages/\` |`
  }

  if (analysis.frameworks.includes('express') || analysis.frameworks.includes('fastify') || analysis.frameworks.includes('nest')) {
    return `## Layers

| Layer | Responsibility | Example |
|-------|---------------|---------|
| Types | Data shapes, interfaces, DTOs | \`types/\` |
| Config | Environment, secrets, feature flags | \`config/\` |
| Repository | Data access, ORM models | \`repo/\` |
| Service | Business logic | \`service/\` |
| Controller | HTTP handlers, request/response | \`controller/\` |
| Middleware | Auth, logging, error handling | \`middleware/\` |`
  }

  return `## Layers

_Define your architectural layers here. A common pattern:_

| Layer | Responsibility |
|-------|---------------|
| Types | Data shapes and interfaces |
| Config | Environment and configuration |
| Repository | Data access |
| Service | Business logic |
| Runtime | Application entry, wiring |`
}
