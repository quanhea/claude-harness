# Template: ARCHITECTURE.md

> This template generates the architecture map following the approach described in
> https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html (linked from the article).
>
> Key principles from matklad's post:
> - "Start with a bird's eye overview of the problem being solved"
> - Include a "codemap describing coarse-grained modules and how they relate"
> - "Name important files, modules, and types"
> - "Explicitly call-out architectural invariants"
> - "Keep it short: every recurring contributor will have to read it"
> - Focus on stable elements, not implementation details
> - Highlight boundaries between layers and cross-cutting concerns
> - Avoid direct links; encourage using symbol search instead
>
> For existing projects: discover via Explore agents.
> For greenfield: research current best practices.
> NEVER hardcode conventions.

---

## How to Generate

### For EXISTING projects:

**Launch an Explore agent** to discover the actual architecture:

```
Agent(subagent_type: "Explore", prompt: "Analyze the architecture of this project thoroughly.
I need to write an ARCHITECTURE.md following the matklad approach
(https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html).

Find:
1. BIRD'S EYE VIEW: What problem does this project solve? What's the high-level approach?
2. CODEMAP: Map ALL coarse-grained modules/packages/crates and what each does.
   For each module, name the important files, types, and traits/interfaces.
3. HOW MODULES RELATE: Trace the import/dependency graph. Which modules depend on which?
   What's the dependency direction?
4. ENTRY POINTS: Where does execution start? What are the main binaries/servers/handlers?
5. ARCHITECTURAL INVARIANTS: What rules does this codebase follow?
   - Layer boundaries (are there layers? what's the allowed dependency direction?)
   - Cross-cutting concerns (how are auth, logging, metrics handled?)
   - Boundary validation (is external data validated at entry?)
6. CROSS-CUTTING CONCERNS: How do auth, logging, metrics, feature flags, error handling
   work across the codebase? Is there a central place or scattered?

Report all findings with specific file paths. Name actual files, types, and functions.")
```

### For GREENFIELD projects:

**Launch a research agent:**

```
Agent(subagent_type: "general-purpose", prompt: "Search the web for current best practices
in {{year}} for {{language}} {{framework}} project architecture. Also read
https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html for the recommended
ARCHITECTURE.md format. Find:
1. Recommended directory structure and module organization
2. Layer/dependency direction patterns
3. Cross-cutting concern patterns
4. The rust-analyzer ARCHITECTURE.md as an example of a well-written one
Search for '{{language}} {{framework}} project structure best practices {{year}}'")
```

---

## Output Structure

Write `ARCHITECTURE.md` at the project root. Follow matklad's structure:

```markdown
# Architecture

This document describes the high-level architecture of {{project-name}}.
If you want to familiarize yourself with the codebase, you are in the right place!

## Bird's Eye View

{{discovered — what problem does this solve? What's the high-level approach?
1-2 paragraphs. The "30 second elevator pitch" of the architecture.}}

## Code Map

{{For each coarse-grained module, describe:
- What it does (one sentence)
- Important files/types/interfaces inside it
- What it depends on and what depends on it

Format like this:}}

### `{{module-name}}/`

{{one-line description of responsibility}}

Important types/files:
- `{{important-file}}` — {{what it does}}
- `{{important-type}}` — {{what it represents}}

### `{{next-module}}/`

{{repeat for each module}}

## Architectural Invariants

{{discovered — the rules this codebase follows. Be explicit.}}

{{Examples of what to state here (but discover, don't hardcode):}}
{{- Dependency direction between modules/layers}}
{{- How cross-cutting concerns are accessed}}
{{- Boundary validation rules}}
{{- Anything that would break if violated}}

## Cross-Cutting Concerns

{{discovered — how these work across the codebase:}}

{{- **Auth**: how authentication/authorization flows}}
{{- **Logging**: what logger, structured or not, where configured}}
{{- **Error handling**: the pattern (exceptions, Result types, error codes)}}
{{- **Metrics/tracing**: what's instrumented, how}}
{{- **Feature flags**: if used, how}}

## Entry Points

{{discovered — where execution starts}}
{{- Main binary/server entry}}
{{- HTTP handler registration}}
{{- CLI command registration}}
{{- Worker/consumer entry}}
```

## Adaptation Instructions

1. Follow matklad's approach: "codemap describing coarse-grained modules and how they relate"
2. Name ACTUAL files, types, and interfaces — not abstract descriptions
3. Keep it focused on STABLE architecture, not implementation details that change often
4. "Every recurring contributor will have to read it" — keep it concise
5. Avoid direct links to source files; name types and let symbol search find them
6. Explicitly call out architectural invariants — these are the rules
7. The Cross-Cutting Concerns section is critical for agent legibility
8. For existing projects: describe what IS. For greenfield: propose and mark as "proposed"
9. If ARCHITECTURE.md already exists, READ it first and MERGE
