# Template: docs/design-docs/core-beliefs.md

> Article: "a set of core beliefs that define agent-first operating principles"
> For existing projects: discover beliefs from existing docs, conventions, and team culture.
> For greenfield: propose beliefs based on the harness methodology, let user customize.

---

## How to Generate

### For EXISTING projects:

**Launch an Explore agent** to discover existing beliefs/principles:

```
Agent(subagent_type: "Explore", prompt: "Find any existing team principles, conventions,
or documented beliefs in this project:
1. README.md — any 'Philosophy' or 'Principles' section?
2. CONTRIBUTING.md — any stated conventions?
3. docs/ — any existing design principles or core beliefs?
4. CLAUDE.md — any stated principles?
5. Code comments — any 'we do X because Y' patterns?
6. Git history — any commit messages revealing conventions?
Report all findings.")
```

Use findings to write beliefs that reflect the team's ACTUAL values plus the
harness methodology principles.

### For GREENFIELD projects:

Propose beliefs based on:
1. The harness methodology (repo is system of record, progressive disclosure, enforce mechanically)
2. The language/framework community standards
3. The project type (startup MVP vs enterprise vs library)

---

## Output Structure

```markdown
# Core Beliefs

> Agent-first operating principles for {{project-name}}.
> These govern how we build and maintain the codebase.

{{Generate 8-12 beliefs. Each belief should have:}}
{{- A clear rule statement}}
{{- Why it matters (the reasoning)}}
{{- How it's applied in this specific project}}

{{At minimum, include these methodology beliefs:}}
{{1. Repository is the single source of truth}}
{{2. Enforce invariants, not implementations}}
{{3. Parse at boundaries, trust internally}}
{{4. Continuous garbage collection over cleanup sprints}}
{{5. Progressive disclosure of knowledge}}

{{Add project-specific beliefs discovered from the codebase.}}
```

## Adaptation Instructions

1. For existing projects: discovered beliefs take PRIORITY over methodology defaults
2. For greenfield: propose beliefs, clearly mark as "proposed — customize for your team"
3. The user should own this document — it reflects THEIR values, not ours
4. If core-beliefs.md already exists, do NOT overwrite
