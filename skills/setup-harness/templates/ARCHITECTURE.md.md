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

Within each business domain, dependencies flow forward through these layers:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Utils  ──────────────────────┐                 │
│  (outside business domain)    │                 │
│                               ▼                 │
│  ┌──────────── Business Logic Domain ────────┐  │
│  │                                           │  │
│  │  Types → Config → Repo                    │  │
│  │                    │                      │  │
│  │                    ▼                      │  │
│  │  Providers → Service → Runtime → UI       │  │
│  │  (cross-cutting)           │              │  │
│  │                            ▼              │  │
│  │                     App Wiring + UI       │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

| Layer | Responsibility | Example |
|-------|---------------|---------|
| **Types** | Data shapes, interfaces, enums | `types/user.ts` |
| **Config** | Environment, feature flags | `config/app.ts` |
| **Repo** | Data access, API clients, ORM | `repo/user-repo.ts` |
| **Providers** | Cross-cutting interfaces: auth, logging, metrics, feature flags, connectors | `providers/auth.ts`, `providers/telemetry.ts` |
| **Service** | Business logic, orchestration | `service/auth-service.ts` |
| **Runtime** | Server setup, middleware, request handling | `runtime/server.ts` |
| **UI** | Components, pages, layouts | `components/`, `pages/` |
| **App Wiring** | Application entry, dependency injection, route registration | `app.ts`, `main.ts` |
| **Utils** | Pure utilities, shared helpers (OUTSIDE business domain) | `utils/`, `lib/` |

### Cross-Cutting via Providers

Cross-cutting concerns (auth, logging, metrics, feature flags, external connectors)
enter the business domain through a single explicit interface: **Providers**.
Other layers NEVER import these concerns directly — they receive them via
the Providers layer.

## Dependency Rules

### What's allowed

- A layer may depend on layers ABOVE it in the diagram
- Types, Config, Repo feed into Service
- Service depends on Providers for cross-cutting concerns
- Utils may be imported by any layer (it's outside the business domain)
- Cross-domain dependencies go through explicit public APIs

### What's NOT allowed

- Circular dependencies between domains
- UI importing directly from Repo layer (must go through Service)
- Service importing directly from auth/logging (must go through Providers)
- Providers importing from Service, Runtime, or UI
- Implicit globals or singletons (use dependency injection via Providers)

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
