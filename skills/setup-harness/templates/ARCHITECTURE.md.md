# Template: ARCHITECTURE.md

> This template generates the architecture map. It MUST NOT contain hardcoded conventions.
> For existing projects: discover conventions via Explore agents.
> For greenfield: research current best practices via WebSearch.

---

## How to Generate

### For EXISTING projects:

**Launch an Explore agent** to discover the actual architecture:

```
Agent(subagent_type: "Explore", prompt: "Analyze the architecture of this project:
1. Map all top-level directories and what each contains
2. Trace the import/dependency graph — which modules import which
3. Identify the actual layer structure (are there types/, services/, controllers/, etc.?)
4. Find the naming conventions already in use (file naming, class naming, variable naming)
5. Find the test organization pattern (co-located? separate test dir? naming convention?)
6. Find the error handling pattern (exceptions? Result types? error codes?)
7. Find how cross-cutting concerns are handled (auth, logging, metrics)
8. Identify the entry points
Report all findings with specific file paths and examples.")
```

Use the Explore agent's findings to fill in every section below. Do NOT invent conventions — describe what already exists.

### For GREENFIELD projects:

**Launch a research agent** to find current best practices:

```
Agent(subagent_type: "general-purpose", prompt: "Search the web for current best practices 
in {{year}} for {{language}} {{framework}} project architecture. Find:
1. Recommended directory structure
2. Layer/module organization patterns
3. Naming conventions (files, types, functions)
4. Test organization patterns
5. Error handling patterns
6. Dependency direction rules
Search for '{{language}} {{framework}} project structure best practices {{year}}'
and '{{language}} clean architecture {{year}}'")
```

Use the research to propose an architecture. The user can modify it.

---

## Output Structure

Write `ARCHITECTURE.md` with these sections. Every section must be filled from
discovery (existing project) or research (greenfield) — never hardcoded defaults.

```markdown
# Architecture

> Architecture map for {{project-name}}. Source of truth for module boundaries,
> dependency rules, and structural constraints.

## Overview

- **Language**: {{discovered}}
- **Framework**: {{discovered}}
- **Package manager**: {{discovered}}
- **Structure**: {{discovered — single package / monorepo / etc.}}

## Entry Points

{{discovered from Explore agent — list actual entry files with descriptions}}

## Domains / Modules

{{discovered from Explore agent — list actual top-level modules with their responsibility}}

## Layers

{{discovered or researched — the actual layer structure this project uses.
Show a diagram and table. Base this on what EXISTS in the codebase,
not on a hardcoded template.}}

## Dependency Rules

{{discovered from import graph analysis — what imports what.
State the rules as they actually are, then note any violations found.}}

### What's allowed
{{list actual allowed dependency directions}}

### What's NOT allowed
{{list the inverse — what would be a violation}}

## Conventions

### File Organization
{{discovered — how files are actually organized in this project.
What's the max file size trend? Are tests co-located or separate?}}

### Naming
{{discovered — the actual naming conventions in use.
Scan existing files to determine: file naming, type naming, function naming, constant naming.}}

### Error Handling
{{discovered — how errors are actually handled in this project.
Are exceptions used? Result types? Error codes? Is there boundary validation?}}
```

## Adaptation Instructions

1. NEVER use hardcoded examples — every section filled from Explore agent or research
2. For existing projects: describe what IS, not what should be
3. For greenfield: propose based on research, clearly mark as "proposed"
4. If the project already has ARCHITECTURE.md, read it first and MERGE
5. The layer diagram should reflect the ACTUAL project structure
