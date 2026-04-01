---
name: harness-learn
description: Analyze conversation history and generate project-embedded skills from recurring patterns. Use when the user wants to codify workflows, extract skills from past sessions, or says "learn from history", "generate skills", or "what patterns do I use".
allowed-tools: Read, Glob, Grep, Write, Bash
---

# Harness Learn

Analyze this project's conversation history and generate project-embedded skills from recurring patterns.

## Context

- Project conversation history directory: !`ls ~/.claude/projects/ 2>/dev/null | head -20`
- Current project skills: !`ls .claude/skills/ 2>/dev/null || echo "no skills yet"`
- Pattern catalog: read [references/pattern-catalog.md](references/pattern-catalog.md)

## Process

### 1. Find Conversation History

Look for this project's conversation JSONL files in `~/.claude/projects/`. The directory name is derived from the project path (slashes replaced with dashes).

Try to read the most recent session files to find patterns.

### 2. Analyze Patterns

Look for these signals in the conversation history:

**Recurring Workflows**:
- Same type of task requested multiple times (e.g., "review this PR", "fix this test")
- Multi-step processes that follow a pattern
- Commands run repeatedly

**Common Tool Uses**:
- Bash commands that appear frequently
- File patterns that are repeatedly read/edited together
- Grep patterns used for investigation

**Decision Patterns**:
- Architecture decisions that come up repeatedly
- Common review feedback themes
- Recurring debugging strategies

### 3. Match Against Catalog

Compare detected patterns against [references/pattern-catalog.md](references/pattern-catalog.md).
For each pattern with 2+ occurrences, it's worth codifying as a skill.

### 4. Generate Skills

For each detected pattern, create a project-embedded skill at `.claude/skills/<name>/SKILL.md`.

Each generated skill should:
- Have a clear `description` with trigger phrases
- List specific `allowed-tools`
- Include concrete steps (not vague instructions)
- Reference project-specific files and commands
- Include `## Context` section with relevant `!`backtick`` shell injections

Example output:

```yaml
---
name: <pattern-name>
description: <when to use, with trigger phrases>
allowed-tools: Read, Glob, Grep, Bash
---
```

```markdown
# <Pattern Name>

> Auto-generated from conversation history. Customize freely.

## Steps

1. <specific step from the detected pattern>
2. <next step>
3. ...
```

### 5. Report

Summarize:
- How many sessions analyzed
- Patterns detected and their frequency
- Skills generated
- Suggest the user review and customize the generated skills

## Important

- Don't overwrite existing skills — only add new ones
- Generated skill names should be prefixed with the workflow type (e.g., `fix-`, `test-`, `deploy-`)
- Include a note in each generated skill that it was auto-generated
- Skills should be project-specific, not generic
