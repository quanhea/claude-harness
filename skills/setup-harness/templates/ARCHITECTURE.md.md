# Template: docs/ARCHITECTURE.md

> This is a TEMPLATE. Adapt it to the specific project. Replace all {{placeholders}}.
> This file is the source of truth for module boundaries and dependency rules.

---

```markdown
# Architecture

> Architecture map for {{project-name}}. This is the source of truth for module
> boundaries, dependency rules, and structural constraints. Keep this up to date.

## Overview

- **Language**: {{primary-language}}
- **Framework**: {{framework}}
- **Package manager**: {{package-manager}}
- **Structure**: {{single-package or monorepo}}

## Entry Points

{{list-entry-points-discovered, e.g.:}}
- `src/index.ts` — Application entry
- `src/server.ts` — HTTP server

## Domains

{{for-each-detected-domain:}}
- **`{{domain-name}}/`** — {{one-line description of responsibility}}

Each domain owns its types, services, and tests. Cross-domain imports must go
through the domain's public API (index file).

## Layers

Dependencies flow in one direction within each domain:

```
Types → Config → Repository → Service → Runtime → UI
```

| Layer | Responsibility | Example |
|-------|---------------|---------|
| Types | Data shapes, interfaces, enums | `types/user.ts` |
| Config | Environment, feature flags | `config/app.ts` |
| Repository | Data access, API clients | `repo/user-repo.ts` |
| Service | Business logic, orchestration | `service/auth-service.ts` |
| Runtime | Server setup, middleware, providers | `runtime/server.ts` |
| UI | Components, pages, layouts | `components/`, `pages/` |

Cross-cutting concerns (auth, logging, metrics, feature flags) enter through
explicit provider interfaces, never direct imports.

## Dependency Rules

### What's allowed

- A module may depend on modules to its LEFT in the layer chain above
- A module may depend on shared `types/` and `utils/`
- Cross-domain dependencies go through explicit interfaces

### What's NOT allowed

- Circular dependencies between domains
- UI importing directly from Repository layer
- Service layer depending on UI components
- Implicit globals or singletons (use dependency injection)

## Conventions

### File Organization

- One concept per file. If a file grows beyond ~300 lines, split it
- Co-locate tests next to source: `foo.ts` → `foo.test.ts`
- Index files re-export public API only — no logic in index files

### Naming

- Files: kebab-case (`user-service.ts`)
- Types/Classes: PascalCase (`UserService`)
- Functions/variables: camelCase (`getUser`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`)

### Error Handling

- Parse/validate at boundaries (API inputs, external data)
- Use typed errors, not string messages
- Let internal code trust validated data — no redundant checks
```

## Adaptation Instructions

When generating this file for a real project:

1. Fill in `{{placeholders}}` from project analysis
2. Adapt the Layers table to match the project's actual architecture:
   - Backend API: Types → Config → Repo → Service → Controller → Middleware
   - CLI tool: Types → Config → Commands → Handlers
   - Library: Types → Core → Public API
3. List actually discovered domains, not hypothetical ones
4. For monorepos, add a package dependency graph section
5. Adapt Naming conventions to match existing project style
6. Adapt the Error Handling section to the project's language (e.g., Result types for Rust, exceptions for Python)
7. If the project already has an ARCHITECTURE.md, MERGE with it
