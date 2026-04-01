---
name: setup-harness
description: Scaffold this project for agent-first development with Claude Code. Generates CLAUDE.md, architecture docs, rules, skills, agents, and a full docs/ knowledge base following the Harness Engineering methodology. Use when setting up Claude Code for a new project, when the user wants to "harness" their project, or when asked to create an agent-first scaffold.
allowed-tools: Read, Glob, Grep, Write, Edit, Bash
argument-hint: [--force to overwrite existing files]
---

# Setup Harness

Generate a complete agent-first scaffold for this project following the Harness Engineering principles.

## Context: Project Detection

Detect the project's language, framework, package manager, and structure:

- Files in project root: !`ls -1`
- Package manager lockfiles: !`ls -1 package-lock.json yarn.lock pnpm-lock.yaml bun.lockb bun.lock Cargo.lock go.sum Pipfile.lock poetry.lock uv.lock Gemfile.lock composer.lock 2>/dev/null || echo "none found"`
- Git status: !`git rev-parse --is-inside-work-tree 2>/dev/null && echo "git: yes" || echo "git: no"`
- Existing .claude/ setup: !`ls -1 .claude/ 2>/dev/null || echo "no .claude/ directory"`
- Existing docs/: !`ls -1 docs/ 2>/dev/null || echo "no docs/ directory"`
- Existing CLAUDE.md: !`cat .claude/CLAUDE.md 2>/dev/null || cat CLAUDE.md 2>/dev/null || echo "no CLAUDE.md"`
- Source file extensions: !`find . -maxdepth 4 -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.rs" -o -name "*.go" -o -name "*.java" -o -name "*.rb" -o -name "*.php" -o -name "*.swift" -o -name "*.kt" -o -name "*.cs" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*" -not -path "*/target/*" -not -path "*/__pycache__/*" -not -path "*/venv/*" 2>/dev/null | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -10`
- Top-level directories: !`find . -maxdepth 2 -type d -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/.next/*" 2>/dev/null | head -30`

## Principles

Read [references/harness-principles.md](references/harness-principles.md) — these 10 principles govern every file you generate.

The key insight: **CLAUDE.md is a table of contents (~100 lines), not an encyclopedia.**
The knowledge base lives in `docs/`. Rules are enforced mechanically in `.claude/rules/`.

## Templates

Read ALL of these templates. They contain the exact content to generate, with `{{placeholders}}` you must fill in based on the project detection above:

1. [templates/CLAUDE.md.md](templates/CLAUDE.md.md) — The table-of-contents CLAUDE.md
2. [templates/ARCHITECTURE.md.md](templates/ARCHITECTURE.md.md) — Architecture map
3. [templates/settings.json.md](templates/settings.json.md) — Settings with language variants
4. [templates/docs-structure.md](templates/docs-structure.md) — Full docs/ directory
5. [templates/rules.md](templates/rules.md) — Architecture, testing, documentation rules
6. [templates/skills.md](templates/skills.md) — Project-embedded skills (sync, review, plan, quality)
7. [templates/agents.md](templates/agents.md) — Subagents (reviewer, architect, gardener)

## Instructions

You are generating a scaffold for an EXISTING project. Follow these steps exactly:

### Step 1: Analyze

From the context above, determine:
- **Project name** (from package.json, Cargo.toml, go.mod, or directory name)
- **Primary language** (from file extension counts)
- **Framework** (from dependencies — Next.js, React, Django, FastAPI, Rails, etc.)
- **Package manager** (from lockfile — npm, pnpm, yarn, bun, pip, poetry, uv, cargo, go)
- **Test framework** (from devDependencies or config files — vitest, jest, pytest, etc.)
- **Build/test/lint commands** (from package.json scripts, Makefile, etc.)
- **Domains** (from top-level directories under src/ or packages/)
- **Entry points** (src/index.ts, main.py, main.go, etc.)
- **Whether it's a monorepo** (packages/, apps/, lerna.json, pnpm-workspace.yaml)

### Step 2: Check Existing Setup

- If `.claude/CLAUDE.md` or `CLAUDE.md` already exists, read it and MERGE your additions — don't overwrite the user's content
- If `.claude/settings.json` exists, read it and MERGE — add missing permissions, keep existing ones
- If `docs/` exists, only create MISSING files
- If `.claude/rules/` exists, only add MISSING rules
- If `.claude/skills/` exists, only add MISSING skills
- If `.claude/agents/` exists, only add MISSING agents

The `$ARGUMENTS` may contain `--force` — if so, overwrite everything.

### Step 3: Generate Files

Read each template file, fill in all `{{placeholders}}` with real project values, and write the output. Generate in this order:

1. `.claude/CLAUDE.md` — from CLAUDE.md.md template (MUST be under 100 lines)
2. `.claude/settings.json` — from settings.json.md template (pick correct language variant)
3. `docs/ARCHITECTURE.md` — from ARCHITECTURE.md.md template
4. `docs/QUALITY.md` and all docs/ files — from docs-structure.md template
5. `.claude/rules/architecture.md`, `.claude/rules/testing.md`, `.claude/rules/documentation.md` — from rules.md template
6. `.claude/skills/sync/SKILL.md`, `.claude/skills/review/SKILL.md`, `.claude/skills/plan/SKILL.md`, `.claude/skills/quality/SKILL.md` — from skills.md template
7. `.claude/agents/reviewer.md`, `.claude/agents/architect.md`, `.claude/agents/gardener.md` — from agents.md template
8. Update `.gitignore` — add `.claude/settings.local.json` if not already present

### Step 4: Verify

After generating all files, verify:
- `.claude/CLAUDE.md` is under 100 lines
- All `{{placeholders}}` are replaced with real values
- No template instructions remain in the output files
- `docs/ARCHITECTURE.md` lists actually discovered domains, not hypothetical ones
- `.claude/settings.json` is valid JSON

### Step 5: Report

Print a summary:
- List all generated files
- Note any files that were skipped (already existed)
- Suggest next steps: "Run `/sync` to analyze your codebase in depth" and "Run `/quality` to grade each domain"
