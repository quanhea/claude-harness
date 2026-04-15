---
description: Generate ARCHITECTURE.md (matklad format)
outputs: ["ARCHITECTURE.md"]
---

# Task: Generate ARCHITECTURE.md

**Output:** `{{PROJECT_DIR}}/ARCHITECTURE.md`

You are generating ARCHITECTURE.md — the bird's-eye module map of this project. Follow the matklad format: per-module sections with named types and files, not abstract descriptions.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Read existing ARCHITECTURE.md if present"
3. "Launch Explore agent to discover architecture — bird's eye view, module map, entry points, invariants"
4. "Launch Explore agent to discover cross-cutting concerns — auth, logging, error handling, metrics"
5. "Write ARCHITECTURE.md following the exact template"
6. "Verify all module sections name actual files and types, not invented ones"
7. "Verify Architectural Invariants are concrete and verifiable"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Context

Detect language, framework, top-level modules, and whether this is an app by reading the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent) and listing the repo root.

If ARCHITECTURE.md already exists, read it and merge — preserve any user-written invariants.

## Explore Agent Prompt (Task 3)

Launch this agent to gather the raw material:

```
Agent(subagent_type: "Explore", prompt: "Analyze the architecture of this project thoroughly.
I need to write an ARCHITECTURE.md following the matklad approach.

Find:
1. BIRD'S EYE VIEW: What problem does this project solve? What's the high-level approach?
2. CODE MAP: Map ALL coarse-grained modules/packages and what each does.
   For each module, name the important files, types, and interfaces inside it.
3. HOW MODULES RELATE: Trace the import/dependency graph. Which modules depend on which?
   What's the dependency direction?
4. ARCHITECTURAL INVARIANTS: What rules does this codebase follow?
   - Layer boundaries and allowed dependency direction
   - Cross-cutting concern access patterns
   - Boundary validation rules
5. ENTRY POINTS: Where does execution start? Main binary, HTTP server, CLI, workers.

Report all findings with specific file paths and actual type/function names.")
```

## Template

```markdown
# Architecture

This document describes the high-level architecture of {{projectName}}.
If you want to familiarize yourself with the codebase, you are in the right place!

## Bird's Eye View

{{discovered — what problem does this solve? What's the high-level approach?
1-2 paragraphs. The "30 second elevator pitch" of the architecture.}}

## Code Map

### `{{module-name}}/`

{{one-line description of responsibility}}

Important types/files:
- `{{important-file}}` — {{what it does}}
- `{{important-type}}` — {{what it represents}}

### `{{next-module}}/`

{{repeat for each top-level module}}

## Architectural Invariants

{{discovered — the rules this codebase follows. Be explicit.}}

- {{Dependency direction between modules/layers}}
- {{How cross-cutting concerns are accessed}}
- {{Boundary validation rules}}
- {{Anything that would break if violated}}

## Cross-Cutting Concerns

- **Auth**: {{how authentication/authorization flows}}
- **Logging**: {{what logger, structured or not, where configured}}
- **Error handling**: {{the pattern — exceptions, Result types, error codes}}
{{if isApp}}- **Metrics/tracing**: {{what's instrumented, how}}{{end}}

## Entry Points

{{discovered — where execution starts}}
- {{Main binary/server entry with file path}}
- {{HTTP handler registration if applicable}}
- {{CLI command registration if applicable}}
- {{Worker/consumer entry if applicable}}
```

## Rules

- Maximum 200 lines. Be concise.
- Code Map MUST use per-module `### module-name/` sections with "Important types/files:" lists — not a tree diagram.
- Name ACTUAL files and types found in the project — not invented or abstract descriptions.
- Architectural Invariants must be concrete and verifiable, not vague principles.
- Avoid direct links to source files; name types and let symbol search find them.
- Do NOT repeat what's in CLAUDE.md.
