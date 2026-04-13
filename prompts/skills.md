# Task: Generate .claude/skills/ from conversation history

**Output:** `{{PROJECT_DIR}}/.claude/skills/<name>/SKILL.md` (1-N skills)

**Skip if greenfield.** If `.harness/conversations/` does not exist and `git log --oneline | wc -l` returns fewer than 10, generate only the two always-included skills (`/sync`, `/review`) from the templates below, no pattern-mined skills.

You are generating project-specific skills by analyzing the conversation history in `.harness/conversations/` to discover recurring patterns the user repeatedly invokes manually.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Find all conversation files in .harness/conversations/ (if directory exists)"
3. "Analyze conversations for repeated patterns (3+ occurrences = candidate skill)"
4. "Read existing .claude/skills/ directory (do not overwrite existing skills)"
5. "Generate 1-N SKILL.md files for discovered patterns"
6. "Update CLAUDE.md Skills section with generated skill names"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## How to Discover Skills

Read files in `{{PROJECT_DIR}}/.harness/conversations/`. Look for:

1. **Repeated command sequences** — the user types the same multi-step operation 3+ times
2. **Common investigation patterns** — grep + read + correlate that gets repeated
3. **Review workflows** — before-PR checks that happen repeatedly
4. **Deployment or release steps** — repeated sequences around shipping

If `.harness/conversations/` doesn't exist or is empty, generate a default set of skills from the project manifest context:
- `/sync` — re-analyze and update docs
- `/review` — architecture-aware code review

## Skill File Format

For each discovered pattern, create `.claude/skills/<skill-name>/SKILL.md`:

```yaml
---
name: {{skill-name}}
description: {{one-line description — when to use it}}
allowed-tools: {{minimal tool list for this skill}}
argument-hint: {{optional argument description}}
---
```

```markdown
# {{Skill Name}}

{{What this skill does — 1-2 sentences.}}

## Steps

{{The exact steps, derived from the conversation pattern.
Each step should be specific and actionable.}}

## Context

{{What context to read before starting — @ARCHITECTURE.md, @docs/QUALITY_SCORE.md, etc.}}
```

## Always-Generated Skills

Generate these regardless of conversation history, adapting commands to the detected project:

### /sync

Re-analyzes the project and updates stale docs.

```yaml
---
name: sync
description: Re-analyze the project and update documentation to match current code. Use when docs may be stale or after significant code changes.
allowed-tools: Read, Glob, Grep, Write, Edit, Bash
---
```

### /review

Architecture-aware code review of current changes.

```yaml
---
name: review
description: Architecture-aware code review for current changes. Use when reviewing code or before committing.
allowed-tools: Read, Glob, Grep, Bash
argument-hint: [file or branch to review]
---
```

## Rules

- DO NOT create skills for patterns seen only once or twice.
- DO NOT create skills that duplicate Claude's built-in capabilities trivially.
- Each skill must have a clear "When to use it" description in the Skills table in CLAUDE.md.
- If `.claude/skills/` already has entries, read them first — only ADD missing skills, never overwrite.
- Maximum 5 skills total. If more patterns are found, generate the top 5 by frequency.
