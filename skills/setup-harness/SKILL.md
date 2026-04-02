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
- Infrastructure files: !`ls -1 Dockerfile docker-compose*.yml .github/workflows/*.yml .gitlab-ci.yml Jenkinsfile bitbucket-pipelines.yml *.tf terraform.tfvars helmfile.yaml chart.yaml skaffold.yaml 2>/dev/null || echo "none found"`
- IaC directories: !`ls -d k8s/ helm/ charts/ terraform/ infra/ infrastructure/ deploy/ .github/workflows/ 2>/dev/null || echo "none found"`
- Env secrets pattern: !`grep -l 'SENTRY_DSN\|DATADOG\|GRAFANA\|PAGERDUTY\|STRIPE\|SENDGRID\|TWILIO\|SLACK_TOKEN\|NOTION_TOKEN\|LINEAR_API' .env .env.* 2>/dev/null || echo "none found"`
- Existing MCP config: !`cat .mcp.json 2>/dev/null || echo "no .mcp.json"`

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
8. [templates/core-beliefs.md](templates/core-beliefs.md) — Agent-first operating principles
9. [templates/tech-debt-tracker.md](templates/tech-debt-tracker.md) — Technical debt tracking
10. [templates/generated-docs.md](templates/generated-docs.md) — Auto-generated docs directory
11. [templates/knowledge-docs.md](templates/knowledge-docs.md) — DESIGN, FRONTEND, PLANS, PRODUCT_SENSE, RELIABILITY, SECURITY docs + llms.txt reference guide
12. [templates/observability.md](templates/observability.md) — Observability stack setup (apps only)

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
5. `docs/design-docs/core-beliefs.md` — from core-beliefs.md template
6. `docs/exec-plans/tech-debt-tracker.md` — from tech-debt-tracker.md template
7. `docs/generated/README.md` — from generated-docs.md template
8. `docs/PLANS.md`, `docs/PRODUCT_SENSE.md`, `docs/RELIABILITY.md`, `docs/SECURITY.md` — from knowledge-docs.md template (always)
9. `docs/DESIGN.md`, `docs/FRONTEND.md` — from knowledge-docs.md template (only if project has a frontend)
10. `docs/references/README.md` — from knowledge-docs.md template (replaces simple index.md)
11. `docs/OBSERVABILITY.md` + optionally `docker-compose.observability.yml` — from observability.md template (only for apps, not libraries)
12. `.claude/rules/architecture.md`, `.claude/rules/testing.md`, `.claude/rules/documentation.md` — from rules.md template
13. `.claude/skills/sync/SKILL.md`, `.claude/skills/review/SKILL.md`, `.claude/skills/plan/SKILL.md`, `.claude/skills/quality/SKILL.md` — from skills.md template
14. `.claude/agents/reviewer.md`, `.claude/agents/architect.md`, `.claude/agents/gardener.md` — from agents.md template
15. Read `${CLAUDE_PLUGIN_ROOT}/skills/setup-harness/templates/worktree.md` → write `.worktreeinclude` + `docs/WORKTREE.md` + merge `worktree` section into `.claude/settings.json` (only for apps, not libraries)
16. Update `.gitignore` — add `.claude/settings.local.json` and `.harness/` if not already present

### Step 3b: Infrastructure Legibility & MCP Setup

Read `${CLAUDE_PLUGIN_ROOT}/skills/setup-harness/templates/infrastructure.md` and `${CLAUDE_PLUGIN_ROOT}/skills/setup-harness/references/mcp-catalog.md`.

**Scan the project for infrastructure:**
1. Read ALL detected infrastructure files (CI/CD workflows, Dockerfiles, Terraform, k8s manifests, Helm charts)
2. Read docker-compose files to map the service topology
3. Check .env files for external service references (Sentry DSN, Datadog keys, etc.)

**Generate docs/INFRASTRUCTURE.md:**
- Summarize every detected service, CI/CD pipeline, cloud resource, database, and external integration
- This is the agent's map to infrastructure — encode everything found

**Generate or merge .mcp.json:**
- For each detected external system that HAS an MCP server, add an entry
- Read the MCP catalog reference for the correct server config
- If `.mcp.json` already exists, MERGE — don't overwrite

**Print MCP Setup Checklist to the user:**

After generating files, print a checklist with two sections:

1. **Auto-detected** — MCP servers for systems found in the project (with install commands)
2. **Hidden sources** — Ask the user: "Does your team use any of these? Setting up the MCP server makes that knowledge visible to the agent:"
   - Slack (team decisions, incident threads)
   - Notion (product specs, knowledge base)
   - Google Drive (shared documents)
   - Figma (design files, component specs)
   - Jira (if using instead of detected tracker)
   - Linear (if using instead of detected tracker)

3. **No MCP available** — Systems documented in docs/INFRASTRUCTURE.md instead (CI/CD, Docker, Helm)

### Step 4: Generate Skills from Conversation History

Export this project's conversation history, then read the conversations to identify reusable workflows that should become project skills.

```bash
NODE_PATH="${CLAUDE_PLUGIN_DATA}/node_modules" node "${CLAUDE_PLUGIN_ROOT}/scripts/export-conversations.mjs" .harness/conversations 30
```

This writes one `.json` file per session to `.harness/conversations/`, each containing the full message array in the exact SDK format.

**CRITICAL: How to read each conversation correctly.**

For each session JSON file, trace the conversation like this:

1. **Focus on USER messages only first.** Read every message where `type="user"` and `message.content` is a string (skip tool_result messages). These are the user's actual requests and corrections. This is the INTENT.

2. **Pay close attention to user CORRECTIONS.** When a user says "no", "wrong", "not that", "wait", "actually", "instead", or interrupts — everything BEFORE that correction is the WRONG approach. Ignore it. The correct approach starts AFTER the correction.

3. **Find the LAST SUCCESSFUL RUN.** In each conversation, the final sequence of tool calls that completed without user correction is the one that worked. Earlier attempts that the user rejected or interrupted are failed approaches — do NOT use them as the basis for a skill.

4. **The skill should encode the FINAL WORKING version**, not the first attempt. If Claude tried approach A, user said "no", then Claude did approach B which succeeded — the skill should encode approach B.

**Pattern identification:**

- Read through all sessions, focusing on user queries and the final successful resolution
- Group sessions by what the user was trying to accomplish (not by what tools were used)
- A pattern is reusable if the SAME TYPE of user request appears 3+ times
- For each pattern, extract the steps from the LAST SUCCESSFUL attempt in the most recent session

**For each pattern with 3+ occurrences, generate a skill at `.claude/skills/<name>/SKILL.md`:**

- `description` under 250 chars, action verb first
- Steps extracted from the FINAL WORKING approach (after all user corrections)
- Project-specific commands and paths from the successful runs
- Include the user's corrections as guardrails (e.g., "Do NOT do X, instead do Y")

Add `.harness/` to `.gitignore` (conversation exports are ephemeral, not committed).

### Step 5: Verify & Report

- Confirm `.claude/CLAUDE.md` is under 100 lines
- Confirm `.claude/settings.json` is valid JSON
- List all generated files and any skipped (already existed)
- List generated skills from conversation analysis with their reusability score
- Suggest: "The linter hooks are now active — they check every file edit"
  - "The linter hooks are active — they'll check every file you edit"
